/**
 * Regenera las locuciones de la guía con la API de ElevenLabs.
 * La API key NUNCA va en el sitio: se lee de la variable de entorno.
 *
 *   ELEVENLABS_API_KEY=xxxx node tools/generar-audios.mjs            (todas)
 *   ELEVENLABS_API_KEY=xxxx node tools/generar-audios.mjs sismo rcp  (algunas)
 *
 * Voz: "Carlos – Premium Latin American Spanish Narrator" (Y4HwpMNrBWN5dFKi5Lw8).
 * Los textos son idénticos a las transcripciones visibles en index.html.
 */
import { writeFile } from 'node:fs/promises';

const KEY = process.env.ELEVENLABS_API_KEY;
const VOZ = process.env.ELEVENLABS_VOICE_ID || 'Y4HwpMNrBWN5dFKi5Lw8';
const MODELO = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
if (!KEY) { console.error('Falta ELEVENLABS_API_KEY'); process.exit(1); }

const TEXTOS = {
  'bienvenida': '¡Hola! Soy Orni, brigadista de la Universidad Militar Nueva Granada, sede Campus Cajicá. Te acompaño por esta guía de emergencias. Si estás viviendo una emergencia ahora mismo, toca el botón rojo de arriba: te conecta directamente con la línea uno, dos, tres. Puedes navegar con el teclado: presiona la tecla Tab para avanzar, y la tecla A para escuchar cualquier sección en voz alta.',
  'sismo': 'Qué hacer en un sismo. Durante el movimiento, no corras. Agáchate, cúbrete y sujétate. Agáchate sobre tus manos y rodillas. Cubre tu cabeza y cuello debajo de una mesa firme, o junto a una pared interior, lejos de ventanas. Sujétate hasta que el movimiento termine. No uses ascensores y no te ubiques bajo el marco de las puertas. Cuando pare el sismo, revisa si hay heridos, sal con calma por la ruta de evacuación señalizada y dirígete al punto de encuentro. Prepárate para réplicas. Si alguien está atrapado o herido, llama a la línea uno, dos, tres.',
  'incendio': 'Qué hacer en un incendio. Da la alarma y sal de inmediato. El humo es más peligroso que el fuego: si hay humo, agáchate y avanza a gatas, con la cabeza cerca del piso, donde el aire es más limpio. Antes de abrir una puerta, tócala con el dorso de la mano; si está caliente, no la abras y usa otra salida. Nunca uses el ascensor y nunca regreses por tus objetos. Si tu ropa se prende, detente, tírate al suelo y rueda. Ya afuera, ve al punto de encuentro y llama al uno, dos, tres.',
  'rcp': 'Reanimación con solo las manos, para adultos. Primero, verifica que el lugar sea seguro. Toca a la persona por los hombros y pregúntale en voz alta si está bien. Si no responde y no respira con normalidad, llama al uno, dos, tres, pon el altavoz y pide un desfibrilador. Coloca el talón de una mano en el centro del pecho, sobre la mitad inferior del esternón, y la otra mano encima. Con los brazos rectos, empuja fuerte y rápido: al menos cinco centímetros de profundidad, a un ritmo de cien a ciento veinte compresiones por minuto. Deja que el pecho vuelva a su posición después de cada compresión. No pares hasta que llegue ayuda o el desfibrilador indique otra cosa.',
  'extintor': 'Cómo usar un extintor con el método PASS. Úsalo solo si el fuego es pequeño, tienes una salida a tu espalda y alguien ya dio la alarma. Uno: jala el seguro, rompiendo el precinto. Dos: apunta la boquilla hacia la base del fuego, no a las llamas. Tres: presiona la palanca con firmeza. Cuatro: barre de lado a lado sobre la base del fuego hasta apagarlo. Retrocede sin dar la espalda, porque el fuego puede reavivarse. Si el fuego crece, sal de inmediato y llama al uno, dos, tres.',
  'punto-encuentro': 'Evacuación hacia el punto de encuentro del Campus Cajicá. Cuando suene la alarma o lo indique la brigada, deja lo que estés haciendo y sal caminando, sin correr, por la ruta señalizada. Sigue las flechas verdes de salida y las instrucciones de los brigadistas. Ayuda a las personas con discapacidad o movilidad reducida. Dirígete a la zona abierta más cercana, lejos de edificios, árboles y cables. Repórtate con tu docente o con la brigada, y no regreses a los edificios hasta que la brigada lo autorice.',
  'mochila': 'Tu kit de emergencia. Ten lista una maleta con: agua potable, alimentos no perecederos, linterna y pilas, radio, botiquín y tus medicamentos, un silbato para pedir ayuda, copia de tus documentos en bolsa plástica, algo de dinero en efectivo, ropa abrigada, artículos de aseo y una batería para el celular. Revísala cada seis meses.',
  'llamada-123': 'Cómo llamar a la línea uno, dos, tres. Es gratuita y funciona desde cualquier celular. Habla despacio y responde cuatro cosas: dónde estás, por ejemplo, Universidad Militar Nueva Granada, Campus Cajicá, kilómetro dos vía Cajicá Zipaquirá, y el edificio. Qué está pasando. Cuántas personas están afectadas. Y quién eres, con tu número de teléfono. No cuelgues hasta que el operador te lo indique.',
  'tour-categorias': 'Aquí eliges el tipo de emergencia: sismo, incendio, emergencia médica o seguridad. Cada ficha te dice qué hacer antes, durante y después, y tiene su propio botón para escucharla.',
  'tour-animaciones': 'Estas animaciones te enseñan paso a paso: cómo protegerte en un sismo, el ritmo de las compresiones de reanimación, el uso del extintor, cómo salir por debajo del humo y cómo llegar al punto de encuentro. Cada una tiene su descripción en audio.',
  'tour-mapa': 'Este es el mapa real del Campus Cajicá. Los marcadores verdes son zonas abiertas para reunirse después de evacuar, y la cruz roja es la enfermería, junto a las canchas. Debajo del mapa tienes la misma lista en texto, con botones para abrir la ruta en tu celular.',
  'tour-directorio': 'En el directorio, toca cualquier número y tu celular empezará la llamada. Más abajo puedes llenar tu ficha médica: tipo de sangre, alergias, medicamentos y un contacto de emergencia. Se guarda solo en este dispositivo y funciona sin internet.'
};

const pedidos = process.argv.slice(2);
for (const [clave, texto] of Object.entries(TEXTOS)) {
  if (pedidos.length && !pedidos.includes(clave)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: texto, model_id: MODELO, voice_settings: { stability: 0.6, similarity_boost: 0.8 } })
  });
  if (!r.ok) { console.error(clave, r.status, await r.text()); continue; }
  await writeFile(new URL(`../audios/orni-${clave}.mp3`, import.meta.url), Buffer.from(await r.arrayBuffer()));
  console.log('✓', clave);
}
