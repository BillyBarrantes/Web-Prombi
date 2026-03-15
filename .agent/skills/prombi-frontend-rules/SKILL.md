---
name: PromBi Frontend Rules
description: Reglas estrictas de desarrollo frontend para la Landing Page de PromBi Web
---

# REGLAS ESTRICTAS DE DESARROLLO FRONTEND (PROMBI WEB) 🚨

Al trabajar en la interfaz de usuario de PromBi, debes cumplir estrictamente las siguientes reglas en todo momento:

1. **Aislamiento de Componentes**:
   - Cada sección de la web (Hero, Pricing, Bento Grid, etc.) DEBE ser un componente React independiente dentro de su propio archivo en `src/components/`.
   - Si se te pide modificar una métrica, sección o componente (por ejemplo, el Hero), NO alteres el código de otros componentes (como el Pricing) ni la estructura principal en `index.html`, `main.jsx` o `App.jsx` a menos que sea necesario para importar el nuevo componente.

2. **Tailwind Estricto**:
   - Usa EXCLUSIVAMENTE clases de Tailwind CSS para todos los estilos.
   - **Prohibido** crear estilos en línea (ej. `style={{ color: 'red' }}`).
   - **Prohibido** crear o agregar reglas en archivos CSS externos a menos que sea indispensable para una animación muy específica que Tailwind no pueda manejar nativamente.

3. **Responsividad Obligatoria (Mobile-First)**:
   - Todo código generado debe verse perfecto en celular por defecto.
   - Es obligatorio el uso de los prefijos de breakpoint de Tailwind (`md:`, `lg:`, `xl:`) para ajustar el diseño en pantallas de tablet y escritorio.
   - Nunca asumas que el diseño es solo para escritorio.

4. **Entregas Quirúrgicas**:
   - Si se requiere cambiar un detalle (ej. el color de un botón o un texto), entrega **SOLO** el bloque de código afectado con instrucciones precisas de dónde reemplazarlo.
   - NUNCA devuelvas ni reescribas un archivo completo de cientos de líneas si los cambios son menores.
   - Nunca modifiques una función existente que ya trabaja correctamente sin una directiva o permiso explícito.
