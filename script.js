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

let streamCamara;


// =====================================================
// ABRIR CÁMARA
// =====================================================

btnAbrirCamara.addEventListener("click", async () => {

    try {

        streamCamara =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: "environment"
                    },

                    width: {
                        ideal: 1920
                    },

                    height: {
                        ideal: 1080
                    }

                },

                audio: false

            });

        video.srcObject =
            streamCamara;

        configurarZoom();

        contenedorCamara.classList.remove(
            "oculto"
        );

        document
            .getElementById("controlesCamara")
            .classList.remove(
                "oculto"
            );

    } catch (error) {

        console.error(error);

        alert(
            "No fue posible acceder a la cámara."
        );

    }

});


// =====================================================
// CAPTURAR
// =====================================================

btnCapturar.addEventListener("click", () => {

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;

    if (
        !videoWidth ||
        !videoHeight
    ) {

        alert(
            "La cámara todavía no está lista."
        );

        return;

    }

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

    resultado.classList.remove(
        "oculto"
    );

    procesarDocumento();

});


// =====================================================
// PROCESAR DOCUMENTO
// =====================================================

function procesarDocumento() {

    if (
        typeof cv === "undefined" ||
        !cv.Mat
    ) {

        alert(
            "La herramienta de detección todavía está cargando. Espera unos segundos y vuelve a capturar."
        );

        return;

    }


    let imagenOriginal = null;
    let imagenDeteccion = null;
    let gris = null;
    let desenfoque = null;
    let bordes = null;
    let bordesCerrados = null;
    let kernel = null;
    let contornos = null;
    let jerarquia = null;
    let mejorContorno = null;


    try {

        // -------------------------------------------------
        // 1. CARGAR IMAGEN COMPLETA
        // -------------------------------------------------

        imagenOriginal =
            cv.imread(canvas);


        // -------------------------------------------------
        // 2. REDUCIR SOLO PARA DETECCIÓN
        // -------------------------------------------------

        const escalaMaxima =
            1400;

        let factor = 1;

        if (
            imagenOriginal.cols >
            escalaMaxima
        ) {

            factor =
                escalaMaxima /
                imagenOriginal.cols;

        }


        imagenDeteccion =
            new cv.Mat();


        if (
            factor < 1
        ) {

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


        // -------------------------------------------------
        // 3. ESCALA DE GRISES
        // -------------------------------------------------

        gris =
            new cv.Mat();

        cv.cvtColor(

            imagenDeteccion,

            gris,

            cv.COLOR_RGBA2GRAY

        );


        // -------------------------------------------------
        // 4. SUAVIZAR
        // -------------------------------------------------

        desenfoque =
            new cv.Mat();

        cv.GaussianBlur(

            gris,

            desenfoque,

            new cv.Size(
                5,
                5
            ),

            0

        );


        // -------------------------------------------------
        // 5. DETECTAR BORDES
        // -------------------------------------------------

        bordes =
            new cv.Mat();

        cv.Canny(

            desenfoque,

            bordes,

            30,
            100

        );


        // -------------------------------------------------
        // 6. CERRAR PEQUEÑOS HUECOS
        // -------------------------------------------------

        kernel =
            cv.Mat.ones(

                7,
                7,
                cv.CV_8U

            );


        bordesCerrados =
            new cv.Mat();


        cv.morphologyEx(

            bordes,

            bordesCerrados,

            cv.MORPH_CLOSE,

            kernel

        );


        // -------------------------------------------------
        // 7. BUSCAR CONTORNOS
        // -------------------------------------------------

        contornos =
            new cv.MatVector();

        jerarquia =
            new cv.Mat();


        cv.findContours(

            bordesCerrados,

            contornos,

            jerarquia,

            cv.RETR_LIST,

            cv.CHAIN_APPROX_SIMPLE

        );


        // -------------------------------------------------
        // 8. BUSCAR EL MEJOR RECTÁNGULO
        // -------------------------------------------------

        let mejorArea =
            0;

        const areaImagen =
            imagenDeteccion.cols *
            imagenDeteccion.rows;


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
             * ANTES:
             *
             * area mínima = 15%
             *
             * AHORA:
             *
             * permitimos documentos
             * mucho más pequeños.
             */

            if (
                area <
                areaImagen * 0.03
            ) {

                contorno.delete();

                continue;

            }


            const perimetro =
                cv.arcLength(

                    contorno,

                    true

                );


            if (
                perimetro <= 0
            ) {

                contorno.delete();

                continue;

            }


            // ---------------------------------------------
            // APROXIMACIÓN MÁS TOLERANTE
            // ---------------------------------------------

            const aproximado =
                new cv.Mat();


            cv.approxPolyDP(

                contorno,

                aproximado,

                0.035 *
                perimetro,

                true

            );


            // ---------------------------------------------
            // SI TIENE 4 PUNTOS
            // ---------------------------------------------

            if (
                aproximado.rows === 4
            ) {

                /*
                 * Ya no exigimos aquí que
                 * sea perfectamente convexo.
                 */

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

                /*
                 * Si no tiene exactamente
                 * 4 puntos, intentamos
                 * encontrar un rectángulo
                 * mediante boundingRect.
                 */

                aproximado.delete();


                const rect =
                    cv.boundingRect(
                        contorno
                    );


                const areaRectangulo =
                    rect.width *
                    rect.height;


                /*
                 * El rectángulo debe ocupar
                 * una parte razonable de la
                 * imagen.
                 */

                if (
                    areaRectangulo >
                    areaImagen * 0.08
                ) {

                    /*
                     * Calculamos qué tan
                     * rectangular es.
                     */

                    const porcentaje =
                        area /
                        areaRectangulo;


                    /*
                     * Aceptamos rectángulos
                     * con bastante margen.
                     */

                    if (
                        porcentaje >
                        0.45 &&
                        areaRectangulo >
                        mejorArea
                    ) {

                        const puntosRect =
                            new cv.Mat(
                                4,
                                1,
                                cv.CV_32SC2
                            );


                        puntosRect.data32S[0] =
                            rect.x;

                        puntosRect.data32S[1] =
                            rect.y;

                        puntosRect.data32S[2] =
                            rect.x +
                            rect.width;

                        puntosRect.data32S[3] =
                            rect.y;

                        puntosRect.data32S[4] =
                            rect.x +
                            rect.width;

                        puntosRect.data32S[5] =
                            rect.y +
                            rect.height;

                        puntosRect.data32S[6] =
                            rect.x;

                        puntosRect.data32S[7] =
                            rect.y +
                            rect.height;


                        if (
                            mejorContorno
                        ) {

                            mejorContorno.delete();

                        }


                        mejorContorno =
                            puntosRect;


                        mejorArea =
                            areaRectangulo;

                    }

                }

            }


            contorno.delete();

        }


        // =================================================
        // 9. SI ENCONTRÓ DOCUMENTO
        // =================================================

        if (
            mejorContorno
        ) {

            const puntos =
                obtenerPuntosOrdenados(
                    mejorContorno
                );


            // ---------------------------------------------
            // Convertir coordenadas
            // ---------------------------------------------

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


            const dimensiones =
                obtenerDimensionesDocumento();


            // ---------------------------------------------
            // PUNTOS ORIGEN
            // ---------------------------------------------

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


            // ---------------------------------------------
            // PUNTOS DESTINO
            // ---------------------------------------------

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


            // ---------------------------------------------
            // TRANSFORMACIÓN
            // ---------------------------------------------

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


            // ---------------------------------------------
            // MOSTRAR RESULTADO
            // ---------------------------------------------

            canvasResultado.width =
                dimensiones.ancho;

            canvasResultado.height =
                dimensiones.alto;


            cv.imshow(

                canvasResultado,

                documentoEnderezado

            );


            mejorarDocumento();


            // ---------------------------------------------
            // LIMPIEZA
            // ---------------------------------------------

            puntosOrigen.delete();
            puntosDestino.delete();
            matrizPerspectiva.delete();
            documentoEnderezado.delete();


        } else {

            // =================================================
            // 10. MODO DE RESPALDO
            // =================================================
            //
            // SI NO DETECTAMOS EL DOCUMENTO:
            //
            // NO MOSTRAMOS ERROR.
            //
            // UTILIZAMOS TODA LA IMAGEN.
            // =================================================


            console.log(
                "No se detectó un contorno confiable. Se utilizará la imagen completa."
            );


            const dimensiones =
                obtenerDimensionesDocumento();


            canvasResultado.width =
                dimensiones.ancho;

            canvasResultado.height =
                dimensiones.alto;


            const contexto =
                canvasResultado.getContext(
                    "2d"
                );


            contexto.drawImage(

                canvas,

                0,
                0,

                canvas.width,
                canvas.height,

                0,
                0,

                dimensiones.ancho,
                dimensiones.alto

            );


            mejorarDocumento();

        }


        // =================================================
        // LIMPIEZA OPENCV
        // =================================================

        if (imagenOriginal)
            imagenOriginal.delete();

        if (imagenDeteccion)
            imagenDeteccion.delete();

        if (gris)
            gris.delete();

        if (desenfoque)
            desenfoque.delete();

        if (bordes)
            bordes.delete();

        if (bordesCerrados)
            bordesCerrados.delete();

        if (kernel)
            kernel.delete();

        if (contornos)
            contornos.delete();

        if (jerarquia)
            jerarquia.delete();

        if (mejorContorno)
            mejorContorno.delete();


    } catch (error) {

        console.error(
            "Error procesando documento:",
            error
        );


        /*
         * Incluso si OpenCV falla,
         * mostramos la fotografía completa.
         */

        try {

            const dimensiones =
                obtenerDimensionesDocumento();


            canvasResultado.width =
                dimensiones.ancho;

            canvasResultado.height =
                dimensiones.alto;


            const contexto =
                canvasResultado.getContext(
                    "2d"
                );


            contexto.drawImage(

                canvas,

                0,
                0,

                canvas.width,
                canvas.height,

                0,
                0,

                dimensiones.ancho,
                dimensiones.alto

            );


            mejorarDocumento();


        } catch (
            errorRespaldo
        ) {

            console.error(
                "Error en modo de respaldo:",
                errorRespaldo
            );

            alert(
                "No fue posible procesar la fotografía."
            );

        }

    }

}


// =====================================================
// ORDENAR ESQUINAS
// =====================================================

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


    let superiorIzquierda =
        puntos[0];

    let superiorDerecha =
        puntos[0];

    let inferiorDerecha =
        puntos[0];

    let inferiorIzquierda =
        puntos[0];


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


        // Superior izquierda

        if (
            suma <
            menorSuma
        ) {

            menorSuma =
                suma;

            superiorIzquierda =
                punto;

        }


        // Inferior derecha

        if (
            suma >
            mayorSuma
        ) {

            mayorSuma =
                suma;

            inferiorDerecha =
                punto;

        }


        // Superior derecha

        if (
            diferencia >
            mayorDiferencia
        ) {

            mayorDiferencia =
                diferencia;

            superiorDerecha =
                punto;

        }


        // Inferior izquierda

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


// =====================================================
// TAMAÑO DEL DOCUMENTO
// =====================================================

function obtenerDimensionesDocumento() {

    const tipo =
        tamanoHoja.value;


    const ancho =
        1200;


    let alto;


    if (
        tipo === "carta"
    ) {

        alto =
            Math.round(

                ancho *
                (11 / 8.5)

            );

    }

    else if (
        tipo === "a4"
    ) {

        alto =
            Math.round(

                ancho *
                (297 / 210)

            );

    }

    else {

        // Oficio

        alto =
            Math.round(

                ancho *
                (14 / 8.5)

            );

    }


    return {

        ancho:
            ancho,

        alto:
            alto

    };

}


// =====================================================
// MEJORAR DOCUMENTO
// =====================================================

function mejorarDocumento() {

    const contexto =
        canvasResultado.getContext(
            "2d"
        );


    const ancho =
        canvasResultado.width;

    const alto =
        canvasResultado.height;


    const imagen =
        contexto.getImageData(

            0,
            0,

            ancho,
            alto

        );


    const datos =
        imagen.data;


    for (
        let i = 0;
        i < datos.length;
        i += 4
    ) {

        const rojo =
            datos[i];

        const verde =
            datos[i + 1];

        const azul =
            datos[i + 2];


        // Convertir a gris

        let gris =

            (0.299 * rojo) +

            (0.587 * verde) +

            (0.114 * azul);


        // Contraste moderado

        const contraste =
            1.12;


        gris =

            (
                (gris - 128) *
                contraste
            ) + 128;


        // Iluminar ligeramente

        gris +=
            12;


        // Limitar

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


    contexto.putImageData(

        imagen,

        0,
        0

    );

}


// =====================================================
// ZOOM
// =====================================================

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
        0.1;


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


// =====================================================
// CAMBIAR ZOOM
// =====================================================

zoomCamara.addEventListener(
    "input",
    async () => {

        if (
            !streamCamara
        ) {

            return;

        }


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
                        zoom:
                            zoom
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