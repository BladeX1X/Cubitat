import { ChevronLeft, FileText } from 'lucide-react'

type TermsPageProps = {
  onBack: () => void
}

export function TermsPage({ onBack }: TermsPageProps) {
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
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
                Términos de Servicio
              </h1>
              <p className="text-xs text-neutral-500 font-semibold mt-1">
                Última actualización: 11 de julio de 2026
              </p>
            </div>
          </div>

          {/* Contenido en Prosa */}
          <div className="space-y-6 text-neutral-700 text-sm leading-relaxed">
            <p>
              Bienvenido a <strong>Cubitat</strong> (en lo adelante, &quot;la Plataforma&quot;), accesible a través de{' '}
              <a href="https://cubitathome.com" className="text-emerald-800 hover:underline font-bold">
                https://cubitathome.com
              </a>
              . Al acceder o utilizar nuestro sitio web, usted acepta estar sujeto a los siguientes Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no deberá utilizar nuestro portal.
            </p>

            <h2 className="text-lg font-black text-neutral-950 pt-4">1. Cuenta y Registro de Usuario</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Autenticación:</strong> Para acceder a ciertas funciones, como publicar o guardar inmuebles, es obligatorio registrarse e iniciar sesión a través de correo electrónico o mediante Google Sign-In.
              </li>
              <li>
                <strong>Seguridad:</strong> Usted es responsable de mantener la confidencialidad de su sesión y de todas las actividades que ocurran bajo su cuenta.
              </li>
              <li>
                <strong>Veracidad:</strong> Se compromete a proporcionar información real y verídica (como su nombre y método de contacto). Queda estrictamente prohibida la suplantación de identidad.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">2. Reglas para Publicar Anuncios</h2>
            <p>Al publicar un anuncio en Cubitat, usted acepta cumplir con las siguientes directrices:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Propiedad Real:</strong> Solo se permiten anuncios de propiedades reales, disponibles y ubicadas dentro del territorio nacional de Cuba.
              </li>
              <li>
                <strong>Fotos y Contenido:</strong> Todas las imágenes subidas deben corresponder exactamente al inmueble ofertado. Queda prohibido subir contenido ofensivo, violento, pornográfico, de publicidad ajena al sector inmobiliario o que infrinja derechos de autor.
              </li>
              <li>
                <strong>Moderación Automatizada por IA:</strong> Cubitat procesa y analiza el texto y las imágenes de sus anuncios mediante modelos de Inteligencia Artificial para filtrar spam, estafas y conductas inapropiadas. Nos reservamos el derecho de rechazar de manera automática (<code>rejected</code>) o retener para revisión manual (<code>pending_review</code>) cualquier anuncio que viole estas políticas.
              </li>
              <li>
                <strong>Precios Coherentes:</strong> Los precios deben expresarse en monedas permitidas (CUP, USD o MLC) y ser razonables. No se admiten precios engañosos.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">3. Uso Aceptable y Limitaciones de Responsabilidad</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Conexión entre Partes:</strong> Cubitat actúa únicamente como un portal de anuncios para facilitar el contacto directo entre compradores/arrendatarios y anunciantes. No somos intermediarios, no cobramos comisiones sobre transacciones y no somos responsables de la veracidad legal de los títulos de propiedad ni de los acuerdos particulares a los que lleguen las partes.
              </li>
              <li>
                <strong>Denuncias:</strong> Los usuarios pueden reportar anuncios sospechosos o falsos. Evaluaremos y tomaremos medidas rápidas (ocultar o dar de baja el anuncio) para mantener la seguridad de la comunidad.
              </li>
              <li>
                <strong>Límites de Uso (Rate Limiting):</strong> Implementamos límites técnicos en la cantidad de peticiones, subida de imágenes y envíos de formularios para evitar abusos y ataques informáticos.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">4. Modificaciones y Suspensión del Servicio</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Nos reservamos el derecho de modificar, suspender o discontinuar el portal (o cualquier parte del mismo) en cualquier momento sin previo aviso.
              </li>
              <li>
                Podremos cancelar o suspender su cuenta de manera inmediata si incumple estos Términos de Servicio o si su comportamiento daña la reputación de la Plataforma.
              </li>
            </ul>

            <h2 className="text-lg font-black text-neutral-950 pt-4">5. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos Términos de Servicio se rigen por la legislación vigente de la República de Cuba. Cualquier disputa relacionada con el uso de la Plataforma se someterá a la jurisdicción de los tribunales competentes del territorio nacional.
            </p>

            <h2 className="text-lg font-black text-neutral-950 pt-4">6. Contacto</h2>
            <p>
              Para cualquier aclaración o reclamo sobre estos Términos de Servicio, puede escribirnos a:
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
