const btnAbrirCamara =
    document.getElementById("btnAbrirCamara");

const btnCapturar =
    document.getElementById("btnCapturar");

const contenedorCamara =
    document.getElementById("contenedorCamara");

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("canvas");

const canvasResultado =
    document.getElementById("canvasResultado");

const resultado =
    document.getElementById("resultado");

const tamanoHoja =
    document.getElementById("tamanoHoja");

const controlZoom =
    document.getElementById("controlZoom");

const zoomCamara =
    document.getElementById("zoomCamara");

const valorZoom =
    document.getElementById("valorZoom");

const mensajeExito =
    document.getElementById(
        "mensajeExito"
    );

const canvasDeteccion =
    document.getElementById("canvasDeteccion");

const contextoDeteccion =
    canvasDeteccion.getContext("2d");

let streamCamara;

let deteccionActiva = false;

let ultimaDeteccion = 0;

let capturaAutomaticaEnProceso = false;

let documentoEstableDesde = null;

let ultimosPuntosDetectados = null;


/* ==========================================
   ABRIR CÁMARA
========================================== */

btnAbrirCamara.addEventListener("click", async () => {

    try {

        streamCamara =
    await navigator.mediaDevices.getUserMedia({

        video: {

            facingMode: {
                ideal: "environment"
            },

            width: {
                ideal: 3840
            },

            height: {
                ideal: 2160
            }

        },

        audio: false

    });


        video.srcObject = streamCamara;

       video.srcObject = streamCamara;


/* ==========================================
   CONFIGURAR ENFOQUE
========================================== */

const track =
    streamCamara.getVideoTracks()[0];

const capacidades =
    track.getCapabilities();


console.log(
    "Capacidades de la cámara:",
    capacidades
);


try {

    if (
        capacidades.focusMode
    ) {

        await track.applyConstraints({

            advanced: [

                {
                    focusMode:
                        "continuous"
                }

            ]

        });

    }

} catch (error) {

    console.log(
        "El enfoque continuo no está disponible:",
        error
    );

}


/* ==========================================
   ESPERAR A QUE EL VIDEO ESTÉ LISTO
========================================== */

video.addEventListener(
    "loadedmetadata",
    async () => {

        try {

            await video.play();

        } catch (error) {

            console.log(
                "El video ya está reproduciéndose."
            );

        }


        /*
         * Iniciar las líneas verdes
         */

        iniciarDeteccionEnVivo();

    },
    {
        once: true
    }
);


console.log(
    "Capacidades de la cámara:",
    capacidades
);


try {

    if (
        capacidades.focusMode
    ) {

        await track.applyConstraints({

            advanced: [

                {
                    focusMode:
                        "continuous"
                }

            ]

        });

    }

} catch (error) {

    console.log(
        "El enfoque continuo no está disponible:",
        error
    );

}



        /* ==========================================
           CONFIGURAR ZOOM
        =========================================== */

        configurarZoom();


        /* ==========================================
           MOSTRAR CÁMARA
        =========================================== */

        contenedorCamara.classList.remove("oculto");


        document
            .getElementById("controlesCamara")
            .classList.remove("oculto");


    } catch (error) {

        console.error(error);

        alert(
            "No fue posible acceder a la cámara."
        );

    }

});



/* ==========================================
   CAPTURAR DOCUMENTO
========================================== */

btnCapturar.addEventListener("click", () => {

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    if (!videoWidth || !videoHeight) {

        alert(
            "La cámara todavía no está lista."
        );

        return;

    }


    /* ==========================================
       CANVAS ORIGINAL
    =========================================== */

    canvas.width =
        videoWidth;

    canvas.height =
        videoHeight;


    const contexto =
        canvas.getContext("2d");


    contexto.drawImage(

        video,

        0,

        0,

        videoWidth,

        videoHeight

    );


    resultado.classList.remove("oculto");


    /* ==========================================
       PROCESAR
    =========================================== */

    procesarDocumento();

});



/* ==========================================
   PROCESAR DOCUMENTO
========================================== */

function procesarDocumento() {

    /*
     * Comprobamos que OpenCV esté disponible.
     */

    if (
        typeof cv === "undefined" ||
        !cv.Mat
    ) {

        alert(
            "La herramienta de detección todavía está cargando. Espera unos segundos y vuelve a capturar."
        );

        return;

    }


    try {

        /* ==========================================
           1. OBTENER IMAGEN
        =========================================== */

        const imagenOriginal =
            cv.imread(canvas);


        /* ==========================================
           2. CREAR IMAGEN PARA DETECCIÓN
           
           Reducimos la imagen para que la detección
           sea más rápida.
        =========================================== */

        const escalaMaxima = 1200;

        let factor = 1;


        if (
            imagenOriginal.cols >
            escalaMaxima
        ) {

            factor =
                escalaMaxima /
                imagenOriginal.cols;

        }


        const imagenDeteccion =
            new cv.Mat();


        if (factor < 1) {

            cv.resize(

                imagenOriginal,

                imagenDeteccion,

                new cv.Size(
                    Math.round(
                        imagenOriginal.cols *
                        factor
                    ),
                    Math.round(
                        imagenOriginal.rows *
                        factor
                    )
                ),

                0,
                0,
                cv.INTER_AREA

            );

        } else {

            imagenOriginal.copyTo(
                imagenDeteccion
            );

        }


        /* ==========================================
           3. ESCALA DE GRISES
        =========================================== */

        const gris =
            new cv.Mat();


        cv.cvtColor(

            imagenDeteccion,

            gris,

            cv.COLOR_RGBA2GRAY

        );


        /* ==========================================
           4. REDUCIR RUIDO
        =========================================== */

        const desenfoque =
            new cv.Mat();


        cv.GaussianBlur(

            gris,

            desenfoque,

            new cv.Size(5, 5),

            0

        );


        /* ==========================================
           5. DETECTAR BORDES
        =========================================== */

        const bordes =
            new cv.Mat();


        cv.Canny(

            desenfoque,

            bordes,

            20,
            100

        );


        /* ==========================================
           6. CERRAR PEQUEÑOS HUECOS
           
           Esto ayuda cuando los bordes del papel
           no están completamente definidos.
        =========================================== */

        const kernel =
            cv.Mat.ones(
                10,
                10,
                cv.CV_8U
            );


        const bordesCerrados =
            new cv.Mat();


        cv.morphologyEx(

            bordes,

            bordesCerrados,

            cv.MORPH_CLOSE,

            kernel

        );


        /* ==========================================
           7. BUSCAR CONTORNOS
        =========================================== */

        const contornos =
            new cv.MatVector();


        const jerarquia =
            new cv.Mat();


        cv.findContours(

            bordesCerrados,

            contornos,

            jerarquia,

            cv.RETR_EXTERNAL,

            cv.CHAIN_APPROX_SIMPLE

        );


        /* ==========================================
           8. BUSCAR EL MEJOR CUADRILÁTERO
        =========================================== */

        let mejorContorno = null;

        let mejorArea = 0;


        for (
            let i = 0;
            i < contornos.size();
            i++
        ) {

            const contorno =
                contornos.get(i);


            const area =
                cv.contourArea(
                    contorno
                );


            /*
             * Ignorar objetos pequeños.
             */

            const areaImagen =
                imagenDeteccion.cols *
                imagenDeteccion.rows;


            if (
                area <
                areaImagen * 0.3
            ) {

                contorno.delete();

                continue;

            }


            const perimetro =
                cv.arcLength(
                    contorno,
                    true
                );


            const aproximado =
                new cv.Mat();


            cv.approxPolyDP(

                contorno,

                aproximado,

                0.02 *
                perimetro,

                true

            );


            /*
             * Nos interesa un polígono
             * de exactamente 4 puntos.
             */

            if (
                aproximado.rows === 4 &&
                cv.isContourConvex(
                    aproximado
                )
            ) {

                if (
                    area >
                    mejorArea
                ) {

                    if (
                        mejorContorno
                    ) {

                        mejorContorno.delete();

                    }


                    mejorContorno =
                        aproximado;

                    mejorArea =
                        area;

                } else {

                    aproximado.delete();

                }

            } else {

                aproximado.delete();

            }


            contorno.delete();

        }


        /* ==========================================
           9. SI NO ENCONTRAMOS EL DOCUMENTO
        =========================================== */

        if (!mejorContorno) {

            imagenOriginal.delete();
            imagenDeteccion.delete();
            gris.delete();
            desenfoque.delete();
            bordes.delete();
            bordesCerrados.delete();
            kernel.delete();
            contornos.delete();
            jerarquia.delete();

            alert(
                "No pude detectar las 4 esquinas del documento.\n\nAsegúrate de que el papel esté completamente visible y tenga suficiente contraste con el fondo."
            );

            return;

        }


        /* ==========================================
           10. OBTENER LAS 4 ESQUINAS
        =========================================== */

        const puntos =
            obtenerPuntosOrdenados(
                mejorContorno
            );


        /* ==========================================
           11. CONVERTIR LAS COORDENADAS
           
           La detección se hizo sobre una imagen
           reducida. Ahora volvemos a las
           coordenadas originales.
        =========================================== */

        for (
            let i = 0;
            i < puntos.length;
            i++
        ) {

            puntos[i].x /=
                factor;

            puntos[i].y /=
                factor;

        }


        /* ==========================================
           12. DETERMINAR TAMAÑO FINAL
        =========================================== */

        const dimensiones =
            obtenerDimensionesDocumento();


        /* ==========================================
           13. CREAR MATRICES DE PERSPECTIVA
        =========================================== */

        const puntosOrigen =
            cv.matFromArray(

                4,
                1,
                cv.CV_32FC2,

                [

                    puntos[0].x,
                    puntos[0].y,

                    puntos[1].x,
                    puntos[1].y,

                    puntos[2].x,
                    puntos[2].y,

                    puntos[3].x,
                    puntos[3].y

                ]

            );


        const puntosDestino =
            cv.matFromArray(

                4,
                1,
                cv.CV_32FC2,

                [

                    0,
                    0,

                    dimensiones.ancho,
                    0,

                    dimensiones.ancho,
                    dimensiones.alto,

                    0,
                    dimensiones.alto

                ]

            );


        /* ==========================================
           14. TRANSFORMACIÓN DE PERSPECTIVA
        =========================================== */

        const matrizPerspectiva =
            cv.getPerspectiveTransform(

                puntosOrigen,

                puntosDestino

            );


        const documentoEnderezado =
            new cv.Mat();


        cv.warpPerspective(

            imagenOriginal,

            documentoEnderezado,

            matrizPerspectiva,

            new cv.Size(

                dimensiones.ancho,

                dimensiones.alto

            ),

            cv.INTER_CUBIC,

            cv.BORDER_REPLICATE

        );


        /* ==========================================
           15. PASAR RESULTADO A CANVAS
        =========================================== */

        const canvasTemporal =
            document.createElement(
                "canvas"
            );


        canvasTemporal.width =
            dimensiones.ancho;

        canvasTemporal.height =
            dimensiones.alto;


        cv.imshow(

            canvasTemporal,

            documentoEnderezado

        );


        /* ==========================================
           16. COPIAR AL CANVAS FINAL
        =========================================== */

        canvasResultado.width =
            dimensiones.ancho;

        canvasResultado.height =
            dimensiones.alto;


        const contexto =
            canvasResultado.getContext(
                "2d"
            );


        contexto.drawImage(

            canvasTemporal,

            0,
            0

        );


        /* ==========================================
           17. MEJORAR DOCUMENTO
        =========================================== */

        mejorarDocumento();


        /* ==========================================
           18. LIMPIAR MEMORIA OPENCV
        =========================================== */

        imagenOriginal.delete();
        imagenDeteccion.delete();
        gris.delete();
        desenfoque.delete();
        bordes.delete();
        bordesCerrados.delete();
        kernel.delete();
        contornos.delete();
        jerarquia.delete();
        mejorContorno.delete();
        puntosOrigen.delete();
        puntosDestino.delete();
        matrizPerspectiva.delete();
        documentoEnderezado.delete();


    } catch (error) {

        console.error(
            "Error procesando documento:",
            error
        );


        alert(
            "Ocurrió un error al detectar el documento."
        );

    }

}



/* ==========================================
   ORDENAR LAS 4 ESQUINAS
========================================== */

function obtenerPuntosOrdenados(
    contorno
) {

    const puntos = [];


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const punto =
            contorno.data32S;

        puntos.push({

            x:
                punto[i * 2],

            y:
                punto[i * 2 + 1]

        });

    }


    /*
     * Calculamos:
     *
     * suma = x + y
     * diferencia = x - y
     *
     * Esto permite identificar:
     *
     * 0 = superior izquierda
     * 1 = superior derecha
     * 2 = inferior derecha
     * 3 = inferior izquierda
     */


    let superiorIzquierda = puntos[0];

    let superiorDerecha = puntos[0];

    let inferiorDerecha = puntos[0];

    let inferiorIzquierda = puntos[0];


    let menorSuma =
        Infinity;

    let mayorSuma =
        -Infinity;

    let menorDiferencia =
        Infinity;

    let mayorDiferencia =
        -Infinity;


    for (
        const punto of puntos
    ) {

        const suma =
            punto.x +
            punto.y;


        const diferencia =
            punto.x -
            punto.y;


        if (
            suma <
            menorSuma
        ) {

            menorSuma =
                suma;

            superiorIzquierda =
                punto;

        }


        if (
            suma >
            mayorSuma
        ) {

            mayorSuma =
                suma;

            inferiorDerecha =
                punto;

        }


        if (
            diferencia >
            mayorDiferencia
        ) {

            mayorDiferencia =
                diferencia;

            superiorDerecha =
                punto;

        }


        if (
            diferencia <
            menorDiferencia
        ) {

            menorDiferencia =
                diferencia;

            inferiorIzquierda =
                punto;

        }

    }


    return [

        superiorIzquierda,

        superiorDerecha,

        inferiorDerecha,

        inferiorIzquierda

    ];

}



/* ==========================================
   DIMENSIONES DEL DOCUMENTO
========================================== */

function obtenerDimensionesDocumento() {

    const tipo =
        tamanoHoja.value;


    /*
     * Usamos 1200 píxeles de ancho.
     *
     * La altura depende del tamaño
     * seleccionado.
     */

    const ancho = 2000;

    let alto;


    if (
        tipo === "carta"
    ) {

        /*
         * Carta:
         * 8.5 × 11
         */

        alto =
            Math.round(
                ancho *
                (11 / 8.5)
            );

    } else if (
        tipo === "a4"
    ) {

        /*
         * A4:
         * 210 × 297
         */

        alto =
            Math.round(
                ancho *
                (297 / 210)
            );

    } else {

        /*
         * Oficio:
         * 8.5 × 14
         */

        alto =
            Math.round(
                ancho *
                (13 / 8.5)
            );

    }


    return {

        ancho: ancho,

        alto: alto

    };

}



/* ==========================================
   MEJORAR DOCUMENTO
========================================== */

function mejorarDocumento() {

    const contexto =
        canvasResultado.getContext("2d");


    const ancho =
        canvasResultado.width;

    const alto =
        canvasResultado.height;


    /* ==========================================
       OBTENER IMAGEN ORIGINAL
    ========================================== */

    const imagen =
        contexto.getImageData(
            0,
            0,
            ancho,
            alto
        );


    const datos =
        imagen.data;


    /*
     * Creamos una copia de la imagen original.
     *
     * Es importante porque utilizaremos los píxeles
     * vecinos para mejorar la nitidez.
     */

    const original =
        new Uint8ClampedArray(datos);


    /* ==========================================
       ESCALA DE GRISES + CONTRASTE
    ========================================== */

    for (
        let i = 0;
        i < datos.length;
        i += 4
    ) {

        const rojo =
            original[i];

        const verde =
            original[i + 1];

        const azul =
            original[i + 2];


        let gris =

            (0.299 * rojo) +

            (0.587 * verde) +

            (0.114 * azul);


        /*
         * CONTRASTE SUAVE
         */

        const contraste =
            1.12;


        gris =
            (
                (gris - 128) *
                contraste
            ) + 128;


        /*
         * ACLARAR PAPEL
         */

        gris += 12;


        /*
         * LIMITAR VALORES
         */

        gris =
            Math.max(
                0,
                Math.min(
                    255,
                    gris
                )
            );


        datos[i] =
            gris;

        datos[i + 1] =
            gris;

        datos[i + 2] =
            gris;

        datos[i + 3] =
            255;

    }


    /*
     * Aplicamos primero la escala de grises.
     */

    contexto.putImageData(
        imagen,
        0,
        0
    );


    /* ==========================================
       NITIDEZ (SHARPEN)
    ========================================== */

    const imagenGris =
        contexto.getImageData(
            0,
            0,
            ancho,
            alto
        );


    const grisOriginal =
        new Uint8ClampedArray(
            imagenGris.data
        );


    const resultadoNitidez =
        contexto.createImageData(
            ancho,
            alto
        );


    const salida =
        resultadoNitidez.data;


    /*
     * Intensidad de la nitidez.
     *
     * 0.0 = sin nitidez
     * 0.3 = suave
     * 0.5 = recomendada
     * 1.0 = fuerte
     */

    const intensidad =
        0.45;


    /*
     * Recorremos la imagen.
     *
     * Dejamos intactos los bordes externos
     * para evitar errores.
     */

    for (
        let y = 1;
        y < alto - 1;
        y++
    ) {

        for (
            let x = 1;
            x < ancho - 1;
            x++
        ) {

            const indice =
                (
                    y *
                    ancho +
                    x
                ) * 4;


            const arriba =
                indice -
                (ancho * 4);


            const abajo =
                indice +
                (ancho * 4);


            const izquierda =
                indice - 4;


            const derecha =
                indice + 4;


            /*
             * Filtro de nitidez:
             *
             * centro * 5
             * menos los 4 vecinos.
             */

            const centro =
                grisOriginal[indice];


            const valorNitido =
                (
                    centro * 5
                )

                -

                grisOriginal[arriba]

                -

                grisOriginal[abajo]

                -

                grisOriginal[izquierda]

                -

                grisOriginal[derecha];


            /*
             * Mezclamos el resultado original
             * con la nitidez para evitar que
             * las letras se vuelvan demasiado negras.
             */

            let grisFinal =

                centro +

                (
                    (
                        valorNitido -
                        centro
                    )
                    *
                    intensidad
                );


            grisFinal =
                Math.max(
                    0,
                    Math.min(
                        255,
                        grisFinal
                    )
                );


            salida[indice] =
                grisFinal;

            salida[indice + 1] =
                grisFinal;

            salida[indice + 2] =
                grisFinal;

            salida[indice + 3] =
                255;

        }

    }


    /*
     * Copiar los bordes originales.
     */

    for (
        let x = 0;
        x < ancho;
        x++
    ) {

        let arriba =
            x * 4;


        let abajo =
            (
                (
                    alto - 1
                ) *
                ancho +
                x
            ) * 4;


        salida[arriba] =
            grisOriginal[arriba];

        salida[arriba + 1] =
            grisOriginal[arriba + 1];

        salida[arriba + 2] =
            grisOriginal[arriba + 2];

        salida[arriba + 3] =
            255;


        salida[abajo] =
            grisOriginal[abajo];

        salida[abajo + 1] =
            grisOriginal[abajo + 1];

        salida[abajo + 2] =
            grisOriginal[abajo + 2];

        salida[abajo + 3] =
            255;

    }


    for (
        let y = 0;
        y < alto;
        y++
    ) {

        let izquierda =
            (
                y *
                ancho
            ) * 4;


        let derecha =
            (
                (
                    y *
                    ancho
                ) +
                ancho -
                1
            ) * 4;


        salida[izquierda] =
            grisOriginal[izquierda];

        salida[izquierda + 1] =
            grisOriginal[izquierda + 1];

        salida[izquierda + 2] =
            grisOriginal[izquierda + 2];

        salida[izquierda + 3] =
            255;


        salida[derecha] =
            grisOriginal[derecha];

        salida[derecha + 1] =
            grisOriginal[derecha + 1];

        salida[derecha + 2] =
            grisOriginal[derecha + 2];

        salida[derecha + 3] =
            255;

    }


    /* ==========================================
       MOSTRAR RESULTADO FINAL
    ========================================== */

    contexto.putImageData(
        resultadoNitidez,
        0,
        0
    );

}



/* ==========================================
   CONFIGURAR ZOOM
========================================== */

function configurarZoom() {

    const track =
        streamCamara
            .getVideoTracks()[0];


    const capacidades =
        track.getCapabilities();


    console.log(
        "Capacidades de la cámara:",
        capacidades
    );


    if (
        !capacidades.zoom
    ) {

        console.log(
            "Esta cámara no permite zoom mediante el navegador."
        );

        return;

    }


    const zoomMin =
        capacidades.zoom.min;

    const zoomMax =
        capacidades.zoom.max;

    const zoomPaso =
        capacidades.zoom.step ||
        1;


    zoomCamara.min =
        zoomMin;

    zoomCamara.max =
        zoomMax;

    zoomCamara.step =
        zoomPaso;

    zoomCamara.value =
        zoomMin;


    valorZoom.textContent =
        zoomMin.toFixed(1) +
        "x";


    controlZoom.classList.remove(
        "oculto"
    );

}



/* ==========================================
   CONTROL DE ZOOM
========================================== */

zoomCamara.addEventListener(
    "input",
    async () => {

        const track =
            streamCamara
                .getVideoTracks()[0];


        const zoom =
            parseFloat(
                zoomCamara.value
            );


        try {

            await track.applyConstraints({

                advanced: [

                    {
                        zoom: zoom
                    }

                ]

            });


            valorZoom.textContent =
                zoom.toFixed(1) +
                "x";


        } catch (error) {

            console.error(
                "No se pudo aplicar el zoom:",
                error
            );

        }

    }
);

/* ==========================================
   INICIAR DETECCIÓN EN VIVO
========================================== */

function iniciarDeteccionEnVivo() {

    /*
     * Si ya existe una detección activa,
     * no iniciamos otra.
     */

    if (deteccionActiva) {

        return;

    }


    /*
     * Esperar a que tengamos dimensiones
     * reales de la cámara.
     */

    if (

        !video.videoWidth ||

        !video.videoHeight

    ) {

        setTimeout(

            iniciarDeteccionEnVivo,

            200

        );

        return;

    }


    deteccionActiva = true;


    /*
     * IMPORTANTE:
     *
     * Ajustamos el canvas usando exactamente
     * las dimensiones reales del video.
     */

    canvasDeteccion.width =
        video.videoWidth;


    canvasDeteccion.height =
        video.videoHeight;


    console.log(
        "Detección iniciada:",
        video.videoWidth,
        "x",
        video.videoHeight
    );


    detectarDocumentoEnVivo();

}



/* ==========================================
   DETECCIÓN EN VIVO
========================================== */

function detectarDocumentoEnVivo(timestamp) {

    if (!deteccionActiva) {

        return;

    }


    /*
     * No analizamos cada frame.
     *
     * Analizamos aproximadamente
     * 5 veces por segundo.
     *
     * Esto evita que la cámara
     * se vuelva lenta.
     */

    if (
        timestamp &&
        timestamp - ultimaDeteccion < 200
    ) {

        requestAnimationFrame(
            detectarDocumentoEnVivo
        );

        return;

    }


    ultimaDeteccion = timestamp || 0;


    /*
     * Si OpenCV todavía no terminó
     * de cargar, seguimos intentando.
     */

    if (

        typeof cv === "undefined" ||

        !cv.Mat ||

        !video.videoWidth ||

        !video.videoHeight

    ) {

        requestAnimationFrame(
            detectarDocumentoEnVivo
        );

        return;

    }


    try {

        /* ==========================================
           1. CREAR CANVAS PEQUEÑO
        =========================================== */

        const anchoAnalisis = 500;

        const proporcion =
            video.videoHeight /
            video.videoWidth;


        const altoAnalisis =
            Math.round(

                anchoAnalisis *
                proporcion

            );


        const canvasTemporal =
            document.createElement("canvas");


        canvasTemporal.width =
            anchoAnalisis;

        canvasTemporal.height =
            altoAnalisis;


        const contextoTemporal =
            canvasTemporal.getContext("2d");


        contextoTemporal.drawImage(

            video,

            0,
            0,

            video.videoWidth,
            video.videoHeight,

            0,
            0,

            anchoAnalisis,
            altoAnalisis

        );


        /* ==========================================
           2. LEER IMAGEN CON OPENCV
        =========================================== */

        const imagen =
            cv.imread(canvasTemporal);


        const gris =
            new cv.Mat();


        cv.cvtColor(

            imagen,

            gris,

            cv.COLOR_RGBA2GRAY

        );


        /* ==========================================
           3. REDUCIR RUIDO
        =========================================== */

        const desenfoque =
            new cv.Mat();


        cv.GaussianBlur(

            gris,

            desenfoque,

            new cv.Size(5, 5),

            0

        );


        /* ==========================================
           4. DETECTAR BORDES
        =========================================== */

        const bordes =
            new cv.Mat();


        cv.Canny(

            desenfoque,

            bordes,

            50,
            150

        );


        /* ==========================================
           5. CERRAR PEQUEÑOS HUECOS
        =========================================== */

        const kernel =
            cv.Mat.ones(

                5,
                5,

                cv.CV_8U

            );


        const bordesCerrados =
            new cv.Mat();


        cv.morphologyEx(

            bordes,

            bordesCerrados,

            cv.MORPH_CLOSE,

            kernel

        );


        /* ==========================================
           6. BUSCAR CONTORNOS
        =========================================== */

        const contornos =
            new cv.MatVector();


        const jerarquia =
            new cv.Mat();


        cv.findContours(

            bordesCerrados,

            contornos,

            jerarquia,

            cv.RETR_EXTERNAL,

            cv.CHAIN_APPROX_SIMPLE

        );


        let mejorContorno = null;

        let mejorArea = 0;


        const areaImagen =
            imagen.cols *
            imagen.rows;


        /* ==========================================
           7. BUSCAR DOCUMENTO
        =========================================== */

        for (

            let i = 0;

            i < contornos.size();

            i++

        ) {

            const contorno =
                contornos.get(i);


            const area =
                cv.contourArea(contorno);


            /*
             * Para las líneas verdes
             * usamos un mínimo más bajo
             * que la captura.
             *
             * Esto NO modifica tu
             * procesarDocumento().
             */

            if (

                area <
                areaImagen * 0.04

            ) {

                contorno.delete();

                continue;

            }


            const perimetro =
                cv.arcLength(

                    contorno,

                    true

                );


            const aproximado =
                new cv.Mat();


            /*
             * Un poco más tolerante
             * únicamente para la guía
             * visual.
             */

            cv.approxPolyDP(

                contorno,

                aproximado,

                0.06 *
                perimetro,

                true

            );


            if (

                aproximado.rows === 4 &&

                cv.isContourConvex(
                    aproximado
                )

            ) {

                if (

                    area >
                    mejorArea

                ) {

                    if (
                        mejorContorno
                    ) {

                        mejorContorno.delete();

                    }


                    mejorContorno =
                        aproximado;

                    mejorArea =
                        area;

                } else {

                    aproximado.delete();

                }

            } else {

                aproximado.delete();

            }


            contorno.delete();

        }


        /* ==========================================
           LIMPIAR LÍNEAS ANTERIORES
        =========================================== */

        contextoDeteccion.clearRect(

            0,

            0,

            canvasDeteccion.width,

            canvasDeteccion.height

        );


        /* ==========================================
           8. DIBUJAR SI ENCONTRAMOS DOCUMENTO
        =========================================== */

        if (mejorContorno) {

            const puntos =
                obtenerPuntosOrdenados(
                    mejorContorno
                );

                
            /*
             * Convertimos coordenadas
             * del canvas pequeño al
             * tamaño real del video.
             */

            const escalaX =
                canvasDeteccion.width /
                anchoAnalisis;


            const escalaY =
                canvasDeteccion.height /
                altoAnalisis;


            for (

                let i = 0;

                i < puntos.length;

                i++

            ) {

                puntos[i].x *=
                    escalaX;

                puntos[i].y *=
                    escalaY;

            }


            ultimosPuntosDetectados = puntos.map(
    punto => ({

        x: punto.x,

        y: punto.y

    })
);


dibujarLineasVerdes(
    puntos
);


verificarEstabilidadDocumento(
    puntos
);

        }
        else {

            documentoEstableDesde = null;

        }


        /* ==========================================
           LIMPIAR MEMORIA
        =========================================== */

        imagen.delete();

        gris.delete();

        desenfoque.delete();

        bordes.delete();

        kernel.delete();

        bordesCerrados.delete();

        contornos.delete();

        jerarquia.delete();


        if (mejorContorno) {

            mejorContorno.delete();

        }


    } catch (error) {

        /*
         * Solo mostramos el error
         * en consola para no interrumpir
         * la cámara.
         */

        console.error(

            "Error en detección visual:",

            error

        );

    }


    /*
     * Continuar detección.
     */

    requestAnimationFrame(
        detectarDocumentoEnVivo
    );

}



/* ==========================================
   DIBUJAR LÍNEAS VERDES
========================================== */

function dibujarLineasVerdes(puntos) {

    if (puntos.length !== 4) {

        return;

    }


    const ctx =
        contextoDeteccion;


    /* ==========================================
       CONFIGURACIÓN DE LÍNEAS
    =========================================== */

    ctx.strokeStyle =
        "#00ff00";


    ctx.lineWidth =
        6;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    /*
     * Pequeño brillo para
     * que sea visible.
     */

    ctx.shadowColor =
        "rgba(0, 255, 0, 0.8)";


    ctx.shadowBlur =
        8;


    /* ==========================================
       DIBUJAR DOCUMENTO
    =========================================== */

    ctx.beginPath();


    ctx.moveTo(

        puntos[0].x,

        puntos[0].y

    );


    ctx.lineTo(

        puntos[1].x,

        puntos[1].y

    );


    ctx.lineTo(

        puntos[2].x,

        puntos[2].y

    );


    ctx.lineTo(

        puntos[3].x,

        puntos[3].y

    );


    ctx.closePath();


    ctx.stroke();


    /* ==========================================
       ESQUINAS
    =========================================== */

    ctx.fillStyle =
        "#00ff00";


    for (

        const punto of puntos

    ) {

        ctx.beginPath();


        ctx.arc(

            punto.x,

            punto.y,

            7,

            0,

            Math.PI * 2

        );


        ctx.fill();

    }


    /* ==========================================
       QUITAR SOMBRA
    =========================================== */

    ctx.shadowBlur =
        0;

}

function verificarEstabilidadDocumento(puntos) {

    if (
        capturaAutomaticaEnProceso
    ) {
        return;
    }


    /*
     * Primera detección.
     */

    if (
        documentoEstableDesde === null
    ) {

        documentoEstableDesde =
            Date.now();

        return;

    }


    /*
     * Tiempo que lleva estable.
     */

    const tiempoEstable =
        Date.now() -
        documentoEstableDesde;


    /*
     * Esperamos 1 segundo.
     */

    if (
        tiempoEstable >= 1000
    ) {

        capturarAutomaticamente();

    }

}

function capturarAutomaticamente() {

    if (
        capturaAutomaticaEnProceso
    ) {

        return;

    }


    if (
        !ultimosPuntosDetectados ||
        ultimosPuntosDetectados.length !== 4
    ) {

        return;

    }


    capturaAutomaticaEnProceso = true;


    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    if (
        !videoWidth ||
        !videoHeight
    ) {

        capturaAutomaticaEnProceso =
            false;

        documentoEstableDesde =
            null;

        return;

    }


    /*
     * Capturar imagen original.
     */

    canvas.width =
        videoWidth;

    canvas.height =
        videoHeight;


    const contexto =
        canvas.getContext("2d");


    contexto.drawImage(

        video,

        0,
        0,

        videoWidth,
        videoHeight

    );


    /*
     * Detener detección inmediatamente.
     */

    deteccionActiva =
        false;


    /*
     * Mostrar mensaje.
     */

    mostrarMensajeExito();


    /*
     * Procesar utilizando los puntos
     * que YA detectaron las líneas verdes.
     */

    procesarDocumentoConPuntos(
        ultimosPuntosDetectados
    );


    documentoEstableDesde =
        null;


    ultimosPuntosDetectados =
        null;


    setTimeout(() => {

        capturaAutomaticaEnProceso =
            false;

    }, 1500);

}

function procesarDocumentoConPuntos(
    puntosVideo
) {

    try {

        /*
         * Obtener imagen original.
         */

        const imagenOriginal =
            cv.imread(canvas);


        /*
         * IMPORTANTE:
         *
         * Los puntos fueron detectados
         * en las dimensiones del video.
         *
         * Canvas y video tienen las mismas
         * dimensiones en este momento.
         */

        const puntos =
            puntosVideo;


        /*
         * Obtener dimensiones finales
         * según el tamaño seleccionado.
         */

        const dimensiones =
            obtenerDimensionesDocumento();


        /*
         * Crear puntos de origen.
         */

        const puntosOrigen =
            cv.matFromArray(

                4,

                1,

                cv.CV_32FC2,

                [

                    puntos[0].x,
                    puntos[0].y,

                    puntos[1].x,
                    puntos[1].y,

                    puntos[2].x,
                    puntos[2].y,

                    puntos[3].x,
                    puntos[3].y

                ]

            );


        /*
         * Crear puntos de destino.
         */

        const puntosDestino =
            cv.matFromArray(

                4,

                1,

                cv.CV_32FC2,

                [

                    0,
                    0,

                    dimensiones.ancho,
                    0,

                    dimensiones.ancho,
                    dimensiones.alto,

                    0,
                    dimensiones.alto

                ]

            );


        /*
         * Crear transformación
         * de perspectiva.
         */

        const matrizPerspectiva =
            cv.getPerspectiveTransform(

                puntosOrigen,

                puntosDestino

            );


        const documentoEnderezado =
            new cv.Mat();


        /*
         * Enderezar documento.
         */

        cv.warpPerspective(

            imagenOriginal,

            documentoEnderezado,

            matrizPerspectiva,

            new cv.Size(

                dimensiones.ancho,

                dimensiones.alto

            ),

            cv.INTER_CUBIC,

            cv.BORDER_REPLICATE

        );


        /*
         * Mostrar resultado.
         */

        canvasResultado.width =
            dimensiones.ancho;

        canvasResultado.height =
            dimensiones.alto;


        cv.imshow(

            canvasResultado,

            documentoEnderezado

        );


        /*
         * Mejorar calidad.
         */

        mejorarDocumento();


        /*
         * Mostrar resultado.
         */

        resultado.classList.remove(
            "oculto"
        );


        /*
         * Limpiar memoria.
         */

        imagenOriginal.delete();

        puntosOrigen.delete();

        puntosDestino.delete();

        matrizPerspectiva.delete();

        documentoEnderezado.delete();


    } catch (error) {

        console.error(

            "Error procesando captura automática:",

            error

        );


        alert(

            "Ocurrió un error al procesar el documento."

        );

    }

}

/* ==========================================
   MOSTRAR MENSAJE DE ÉXITO
========================================== */

function mostrarMensajeExito() {

    mensajeExito.classList.remove(
        "oculto"
    );


    setTimeout(() => {

        mensajeExito.classList.add(
            "oculto"
        );

    }, 1500);

}