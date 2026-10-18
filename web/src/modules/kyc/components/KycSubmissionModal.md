# KycSubmissionModal

## Responsabilidad

Presenta el formulario privado para solicitar verificación KYC y comunica su
estado de éxito. El hook `useKycSubmission` conserva la lógica de carga y envío.

## Comportamiento responsive

- El diálogo limita su altura al viewport visible y se adapta a márgenes pequeños
  en móvil.
- El encabezado y el cierre no se desplazan fuera de la vista.
- Si el formulario supera el espacio disponible, solo su contenido se desplaza;
  las acciones siguen dentro del área desplazable.
- La revisión visual debe incluir móvil estrecho y un viewport de poca altura.
