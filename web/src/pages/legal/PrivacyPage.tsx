import { ChevronLeft, Shield } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'

type PrivacyPageProps = {
  onBack: () => void
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  useSEO({
    title: 'Política de Privacidad',
    description: 'Consulta la política de privacidad de Cubitat. Conoce cómo recopilamos, protegemos y gestionamos la información de nuestros usuarios.',
  })

  return (
    <article className="min-h-screen bg-neutral-50/50 py-10 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Navegación de regreso */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-700 transition-colors mb-8 border-none bg-transparent cursor-pointer"
        >
          <ChevronLeft size={16} />
          Volver al inicio
        </button>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xl p-6 md:p-10 space-y-8">
          {/* Encabezado */}
          <div className="flex items-center gap-4 pb-6 border-b border-neutral-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
                Política de Privacidad
              </h1>
              <p className="text-xs text-neutral-500 font-semibold mt-1">
                Última actualización: 11 de julio de 2026
              </p>
            </div>
          </div>

          {/* Contenido en Prosa */}
          <div className="space-y-6 text-neutral-700 text-sm leading-relaxed">
            <p>
              En <strong>Cubitat</strong> (en lo adelante, &quot;la Plataforma&quot;), accesible desde{' '}
              <a href="https://cubitathome.com" className="text-emerald-800 hover:underline font-bold">
                https://cubitathome.com
              </a>
              , la privacidad de nuestros usuarios es una de nuestras principales prioridades. Este documento de Política de Privacidad describe los tipos de información que recopilamos, cómo la utilizamos y las medidas de seguridad que implementamos.
            </p>
            <p>
              Si tiene preguntas adicionales o requiere más información sobre nuestra Política de Privacidad, no dude en ponerse en contacto con nosotros a través de nuestro correo de soporte:{' '}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-xs text-emerald-800">
                soporte@cubitathome.com
              </code>
              .
            </p>

            <h2 className="text-lg font-black text-neutral-950 pt-4">1. Información que Recopilamos</h2>

            <h3 className="font-bold text-neutral-900 mt-2">1.1 Información Proporcionada por el Usuario</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Datos de Registro:</strong> Al crear una cuenta (mediante correo electrónico o Google OAuth), recopilamos su dirección de correo electrónico, nombre y foto de perfil (si se inicia sesión con Google).
              </li>
              <li>
                <strong>Información de Perfil:</strong> Puede decidir agregar información complementaria como su número de teléfono celular o de WhatsApp para facilitar el contacto en los anuncios.
              </li>
              <li>
                <strong>Datos de Publicaciones:</strong> Si publica un anuncio inmobiliario, recopilamos toda la información de la propiedad, incluyendo descripción, precio, dirección (calle, barrio, municipio, provincia), coordenadas geográficas aproximadas e imágenes.
              </li>
              <li>
                <strong>Mensajes de Contacto:</strong> Cuando envía una consulta a través del formulario de contacto de una propiedad, recopilamos su nombre, número de teléfono y el mensaje redactado para transmitírselo de forma segura al anunciante.
              </li>
            </ul>

            <h3 className="font-bold text-neutral-900 mt-2">1.2 Información Recopilada Automáticamente</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Archivos de Registro (Log Files):</strong> Al navegar por la web, el servidor de Cloudflare registra automáticamente información estándar como direcciones IP, tipo de navegador, proveedor de servicios de Internet (ISP), marcas de fecha/hora, páginas de origen/destino y número de clics.
              </li>
              <li>
                <strong>Métricas de Uso:</strong> Utilizamos Google Analytics (GA4) para analizar la interacción del usuario con las distintas páginas y optimizar la usabilidad del portal.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">2. Cómo Utilizamos la Información</h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Proporcionar, operar y mantener nuestro portal inmobiliario.</li>
              <li>Mejorar, personalizar y expandir las funciones de Cubitat.</li>
              <li>Procesar sus publicaciones y moderar el contenido (incluyendo análisis automatizado de spam o abusos mediante inteligencia artificial).</li>
              <li>Facilitar la conexión directa entre compradores/arrendatarios y anunciantes (enviando notificaciones y leads).</li>
              <li>Prevenir fraudes y asegurar el cumplimiento de nuestros Términos de Servicio.</li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">3. Uso de Google OAuth y Supabase</h2>
            <p>
              Cubitat utiliza <strong>Supabase</strong> como proveedor de infraestructura de base de datos y autenticación, el cual integra el servicio de <strong>Google Sign-In (Google OAuth)</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Únicamente solicitamos acceso a sus datos de perfil básico (<code>email</code>, <code>profile</code> e <code>openid</code>).</li>
              <li>No compartimos sus credenciales de acceso con terceros y éstas se almacenan y procesan de forma segura bajo los estándares de Supabase Auth.</li>
              <li>Puede revocar el acceso de Cubitat a su cuenta de Google en cualquier momento desde la configuración de seguridad de su cuenta de Google.</li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">4. Protección y Privacidad de Datos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Ubicación Protegida:</strong> Protegemos activamente la privacidad de los propietarios. Nunca mostraremos la calle o dirección exacta de un inmueble al público en general; solo representaremos una zona de ubicación aproximada en el mapa. La dirección exacta solo se transmitirá al comprador si usted decide compartirla voluntariamente.
              </li>
              <li>
                <strong>Políticas de Retención:</strong> Conservamos su información personal únicamente mientras su cuenta esté activa o sea necesaria para proveer los servicios del portal. Puede solicitar la eliminación definitiva de su cuenta y sus datos escribiendo a nuestro correo de soporte.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">5. Cambios a esta Política de Privacidad</h2>
            <p>
              Nos reservamos el derecho de actualizar nuestra Política de Privacidad periódicamente. Le sugerimos revisar esta página de forma regular para mantenerse informado sobre cualquier modificación.
            </p>

            <h2 className="text-lg font-black text-neutral-950 pt-4">6. Contacto</h2>
            <p>
              Si desea ejercer sus derechos de acceso, rectificación o eliminación de sus datos, contáctenos en:
              <br />
              <strong>Correo electrónico:</strong>{' '}
              <a href="mailto:soporte@cubitathome.com" className="text-emerald-800 hover:underline font-bold">
                soporte@cubitathome.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
