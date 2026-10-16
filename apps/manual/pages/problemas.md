# Si algo no anda

**¿Qué navegador uso?** Las últimas versiones de Chrome, Edge o Safari, en
computadora, tablet o celular. Firefox no está soportado.

**La consola dice "WebGPU is not available".** Es normal: tu navegador no
tiene WebGPU y Lux Studio usa WebGL 2, que se ve igual.

**Va lento.** Cerrá otras pestañas pesadas. Con muchas luminarias, solo las
8 más brillantes hacen sombras, justamente para que siga fluido.

**La luz de un IES se ve rara.** Muchas veces es como es. Hay luminarias que
casi no tiran luz para abajo y la reparten en un anillo, o que tiran mucho
hacia arriba. Revisá también la **Orientación** (inclinación y giro).

**Deshice de más.** **⇧⌘Z** rehace.

**La vista tarda en aparecer.** Lux Studio espera a que carguen las
luminarias, los muebles y las texturas para no mostrar la escena a medias.
Mientras tanto, un indicador muestra que está cargando. Si algo no carga o
tarda más de 15 segundos, se muestra simplificado (una forma básica, una luz
genérica o el color liso de la superficie) y el resto sigue andando.

**Quiero empezar de cero.** La escena se guarda sola en este navegador, así
que recargar la página la trae de vuelta. Para empezar otra, usá **Nuevo**:
un ambiente vacío o una plantilla. Si te arrepentís, **⌘Z**.

**Un enlace compartido no abre.** Tiene que llegar entero: algunas apps de
mensajes lo cortan. Si está dañado, un aviso lo dice y tu escena no cambia. Pedile a quien lo mandó que lo copie de nuevo, o que te mande el
archivo `.luxstudio.json`.

**Quiero reportar un problema.** Abrí Lux Studio con `?debug` al final de la
dirección. Aparece un recuadro con datos técnicos, y la consola del
navegador muestra cada paso. Mandá una captura de las dos cosas.
