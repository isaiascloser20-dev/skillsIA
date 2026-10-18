---
name: seguridad
description: Las puertas de seguridad de tu ecosistema. Se activa SIEMPRE antes de crear una función de base de datos, una pantalla del panel del dueño, una forma de crear cuentas, una política RLS o una página que enseñe contenido de pago, y cuando se habla de seguridad, de fugas, de quién ve qué o de separar la app del panel.
scope: template
---

# Seguridad · las puertas de tu ecosistema

> Una puerta abierta no da error. Devuelve datos y todo parece normal. Por eso se busca.

Nació en NVISION el 2026-10-07, antes de dar acceso a cientos de alumnos. Ese día salieron
a la vez, y ninguna daba error: cualquier cuenta podía pedirle a la base de datos la llave de
Google del dueño, los correos de todos sus clientes y su facturación; el panel del dueño se
protegía con una lista a mano a la que le faltaban seis áreas; y una cuenta creada con el
correo de otro se quedaba con sus compras.

## Las cinco reglas

1. **El panel del dueño se cierra por CARPETA, nunca por una lista.** Un `layout.tsx` en la
   carpeta del panel comprueba el rango real del perfil y manda fuera a quien no sea el dueño.
   Así toda pantalla nueva nace cerrada sin que nadie se acuerde.
2. **Toda función `SECURITY DEFINER` nace cerrada.** Supabase la deja ejecutable por `anon` y
   `authenticated` al crearla. En la misma migración:
   ```sql
   revoke execute on function public.mi_funcion(...) from public, anon, authenticated;
   grant execute on function public.mi_funcion(...) to service_role;
   ```
   Si la usa una pantalla del dueño, esa pantalla comprueba primero que es el dueño y llama con
   la llave del servidor. Solo quedan abiertas las que miran DENTRO quién llama (`auth.uid()`).
3. **Nadie se cambia su propio rango.** La política de `profiles` deja editar el perfil, pero
   no la columna del rol: `with check` más un trigger que impida tocar `role_id` salvo desde el
   servidor.
4. **Si una cuenta hereda compras por su correo, ese correo se prueba.** Un alta que no prueba
   el correo (un pago donde se escribe cualquier correo, un botón con un código compartido) no
   se engancha al historial de ese correo.
5. **Lo de pago se decide ANTES de servir la página.** Si la página decide mientras se pinta,
   el navegador ya ha recibido los archivos con el texto. La decisión va en la puerta de la web
   (el middleware) o en el servidor antes de cualquier componente de cliente.

## Cómo se revisa (una vez por semana y antes de abrir a gente nueva)

Funciones abiertas a cualquier cuenta. Cada una que salga, o mira dentro quién llama, o se cierra:
```sql
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
   and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
```

Toda puerta se prueba como el rango MÁS bajo, nunca como el dueño:
```sql
begin; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<id de una cuenta de prueba sin compras>","role":"authenticated"}', true);
select …; rollback;
```
