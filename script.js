const btnAbrirCamara = document.getElementById("btnAbrirCamara");
const btnCapturar = document.getElementById("btnCapturar");

const contenedorCamara = document.getElementById("contenedorCamara");
const video = document.getElementById("video");

const canvas = document.getElementById("canvas");
const canvasResultado = document.getElementById("canvasResultado");

const resultado = document.getElementById("resultado");

const tamanoHoja = document.getElementById("tamanoHoja");

const guiaDocumento = document.getElementById("guiaDocumento");


let streamCamara;


/* ==========================================
   ABRIR CÁMARA
========================================== */

btnAbrirCamara.addEventListener("click", async () => {

    try {

        streamCamara = await navigator.mediaDevices.getUserMedia({

            video: {

                facingMode: {

                    ideal: "environment"

                }

            },

            audio: false

        });


        video.srcObject = streamCamara;


        contenedorCamara.classList.remove("oculto");

        document.getElementById("controlesCamara")
            .classList.remove("oculto");

        actualizarGuia();


    } catch (error) {

        console.error(error);

        alert("No fue posible acceder a la cámara.");

    }

});



/* ==========================================
   CAMBIAR TAMAÑO DE GUÍA
========================================== */

tamanoHoja.addEventListener("change", () => {

    actualizarGuia();

});


function actualizarGuia() {

    const tamañoSeleccionado = tamanoHoja.value;


    if (tamañoSeleccionado === "carta") {

        guiaDocumento.style.aspectRatio = "8.5 / 11";

    }


    if (tamañoSeleccionado === "oficio") {

        guiaDocumento.style.aspectRatio = "8.5 / 13";

    }

}



/* ==========================================
   CAPTURAR DOCUMENTO
========================================== */

btnCapturar.addEventListener("click", () => {

    const videoWidth = video.videoWidth;

    const videoHeight = video.videoHeight;


    canvas.width = videoWidth;

    canvas.height = videoHeight;


    const contexto = canvas.getContext("2d");


    contexto.drawImage(

        video,

        0,

        0,

        videoWidth,

        videoHeight

    );


    resultado.classList.remove("oculto");


    procesarDocumento();

});



/* ==========================================
   PROCESAR IMAGEN
========================================== */

function procesarDocumento() {

    // ==========================================
    // 1. OBTENER POSICIONES
    // ==========================================

    const rectVideo = video.getBoundingClientRect();
    const rectGuia = guiaDocumento.getBoundingClientRect();


    // ==========================================
    // 2. CONVERTIR COORDENADAS DE PANTALLA
    //    A COORDENADAS REALES DE LA CÁMARA
    // ==========================================

    const escalaX = video.videoWidth / rectVideo.width;
    const escalaY = video.videoHeight / rectVideo.height;


    const x = (rectGuia.left - rectVideo.left) * escalaX;
    const y = (rectGuia.top - rectVideo.top) * escalaY;

    const ancho = rectGuia.width * escalaX;
    const alto = rectGuia.height * escalaY;


    // ==========================================
    // 3. LIMITAR EL RECORTE
    // ==========================================

    const xFinal = Math.max(0, Math.round(x));
    const yFinal = Math.max(0, Math.round(y));

    const anchoFinal = Math.min(
        Math.round(ancho),
        video.videoWidth - xFinal
    );

    const altoFinal = Math.min(
        Math.round(alto),
        video.videoHeight - yFinal
    );


    // ==========================================
    // 4. CONFIGURAR CANVAS
    // ==========================================

    canvasResultado.width = anchoFinal;
    canvasResultado.height = altoFinal;


    const contexto =
        canvasResultado.getContext("2d");


    // ==========================================
    // 5. RECORTAR DOCUMENTO
    // ==========================================

    contexto.drawImage(

        video,

        xFinal,
        yFinal,
        anchoFinal,
        altoFinal,

        0,
        0,
        anchoFinal,
        altoFinal

    );


    // ==========================================
    // 6. OBTENER PÍXELES
    // ==========================================

    const imagen =
        contexto.getImageData(
            0,
            0,
            anchoFinal,
            altoFinal
        );

    const datos = imagen.data;

    // ==========================================
// ESCALA DE GRISES + MEJORA DEL DOCUMENTO
// ==========================================

for (let i = 0; i < datos.length; i += 4) {

    const rojo = datos[i];
    const verde = datos[i + 1];
    const azul = datos[i + 2];

    // Escala de grises
    let gris =
        (0.299 * rojo) +
        (0.587 * verde) +
        (0.114 * azul);

    /*
     * CONTRASTE SUAVE
     *
     * 1.00 = sin contraste
     * 1.10 = muy suave
     * 1.20 = moderado
     */

    const contraste = 1.12;

    gris = ((gris - 128) * contraste) + 128;


    // ==========================================
    // ACLARAR EL PAPEL
    // ==========================================

    gris += 12;


    // ==========================================
    // LIMITAR VALORES
    // ==========================================

    gris = Math.max(0, Math.min(255, gris));


    datos[i] = gris;
    datos[i + 1] = gris;
    datos[i + 2] = gris;
    datos[i + 3] = 255;
}


// ==========================================
// MOSTRAR RESULTADO
// ==========================================

contexto.putImageData(imagen, 0, 0);


// ==========================================
// 7. CONVERTIR A ESCALA DE GRISES
// ==========================================

for (let i = 0; i < datos.length; i += 4) {

    const rojo = datos[i];
    const verde = datos[i + 1];
    const azul = datos[i + 2];


    // Conversión a escala de grises
    let gris =
        (0.299 * rojo) +
        (0.587 * verde) +
        (0.114 * azul);


    // ==========================================
    // 8. AUMENTAR CONTRASTE SIN ELIMINAR
    //    LOS TONOS INTERMEDIOS
    // ==========================================

    const contraste = 1.15;

    gris =
        ((gris - 128) * contraste) + 128;


    // ==========================================
    // 9. ACLARAR LIGERAMENTE EL PAPEL
    // ==========================================

    gris += 8;


    // ==========================================
    // 10. LIMITAR LOS VALORES
    // ==========================================

    gris = Math.max(
        0,
        Math.min(255, gris)
    );


    // ==========================================
    // 11. APLICAR EL RESULTADO
    // ==========================================

    datos[i] = gris;
    datos[i + 1] = gris;
    datos[i + 2] = gris;
    datos[i + 3] = 255;

}


// ==========================================
// 12. MOSTRAR DOCUMENTO
// ==========================================

contexto.putImageData(
    imagen,
    0,
    0
);

}

