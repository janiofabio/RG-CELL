document.addEventListener('DOMContentLoaded', () => {
    const api = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";  // Update with your actual script ID
    const msg = document.querySelector(".message");
    const fileInput = document.querySelector(".file");
    const btn = document.querySelector(".btn");
    const captureBtn = document.querySelector(".capture-btn");
    const snapFrontBtn = document.querySelector(".snap-front-btn");
    const snapBackBtn = document.querySelector(".snap-back-btn");
    const progressBarFill = document.querySelector(".progress-bar-fill");
    const progressInfo = document.querySelector(".progress-info");
    const frontPreview = document.querySelector(".front-preview");
    const backPreview = document.querySelector(".back-preview");
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    let frontImage = null;
    let backImage = null;

    // Detect if the user is on a mobile device
    const isMobileDevice = () => {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    if (isMobileDevice()) {
        captureBtn.style.display = 'block';
    }

    // Process PDF file or images
    btn.addEventListener('click', () => {
        if (frontImage && backImage) {
            convertImagesToPDF(frontImage, backImage);
        } else {
            const file = fileInput.files[0];
            if (!file) {
                alert("Selecione um arquivo PDF primeiro.");
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                alert("O arquivo é muito grande. O tamanho máximo é de 50MB.");
                return;
            }

            processFile(file);
        }
    });

    // Capture images from rear camera (front and back)
    captureBtn.addEventListener('click', async () => {
        const constraints = {
            video: {
                facingMode: { exact: "environment" } // Use rear camera
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.style.display = 'block';
            snapFrontBtn.style.display = 'block';
            snapBackBtn.style.display = 'block';
            video.srcObject = stream;

            video.addEventListener('click', () => {
                let track = stream.getVideoTracks()[0];
                let capabilities = track.getCapabilities();

                if (capabilities.focusMode.includes('continuous')) {
                    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                } else if (capabilities.focusMode.includes('single-shot')) {
                    track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
                }
            });
        } catch (error) {
            console.error("Error accessing the camera: ", error);
            alert("Erro ao acessar a câmera traseira. Por favor, verifique as permissões.");
        }
    });

    // Snap front photo
    snapFrontBtn.addEventListener('click', () => {
        captureImage('front');
    });

    // Snap rear photo
    snapBackBtn.addEventListener('click', () => {
        captureImage('back');
    });

    const captureImage = (side) => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        let imageData = canvas.toDataURL('image/png');
        
        if (side === 'front') {
            frontImage = imageData;
            frontPreview.src = frontImage;
            frontPreview.style.display = 'block';
            alert("Foto da frente capturada com sucesso!");
        } else {
            backImage = imageData;
            backPreview.src = backImage;
            backPreview.style.display = 'block';
            alert("Foto de trás capturada com sucesso!");
        }
    };

    // Function to process file
    const processFile = (file) => {
        msg.innerHTML = `Carregando...`;
        progressBarFill.style.width = '0%';
        progressInfo.innerHTML = '';

        let startTime = Date.now();
        let fr = new FileReader();

        fr.readAsDataURL(file);
        fr.onload = () => {
            let res = fr.result;
            let b64 = res.split("base64,")[1];
            uploadToServer(b64, file.type, file.name, startTime);
        }
    };

    // Function to upload file or image to server and handle OCR
    const uploadToServer = (b64, type, name, startTime) => {
        let uploadProgress = setInterval(() => {
            let elapsed = Date.now() - startTime;
            let percentComplete = Math.min(100, (elapsed / 2000) * 100); // Simulated progress
            progressBarFill.style.width = `${percentComplete}%`;
            progressInfo.innerHTML = `Carregando: ${Math.round(percentComplete)}% - Tempo restante: ${Math.max(0, ((2000 - elapsed) / 1000).toFixed(1))}s - Tamanho do arquivo: ${(b64.length * (3/4) / 1024).toFixed(2)} KB`;
            if (percentComplete >= 100) clearInterval(uploadProgress);
        }, 100);

        fetch(api, {
            method: "POST",
            body: JSON.stringify({
                pdfFile: b64,
                type: type,
                name: name
            })
        })
        .then(res => res.text())
        .then(data => {
            clearInterval(uploadProgress);
            progressBarFill.style.width = '100%';
            msg.innerHTML = ``;
            downloadTextFile(data, "OCR_Resultado.txt");
        })
        .catch(error => {
            clearInterval(uploadProgress);
            msg.innerHTML = `Erro ao processar o arquivo.`;
            console.error('Error:', error);
        });
    };

    // Function to download text file
    const downloadTextFile = (text, filename) => {
        let blob = new Blob([text], { type: 'text/plain' });
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    // Function to convert images to PDF and then upload
    const convertImagesToPDF = (frontImage, backImage) => {
        const pdfDoc = PDFLib.PDFDocument.create();

        const addImageToPDF = async (pdfDoc, imageData) => {
            const img = await pdfDoc.embedPng(imageData);
            const page = pdfDoc.addPage([img.width, img.height]);
            page.drawImage(img, {
                x: 0,
                y: 0,
                width: img.width,
                height: img.height
            });
        };

        addImageToPDF(pdfDoc, frontImage)
            .then(() => addImageToPDF(pdfDoc, backImage))
            .then(() => pdfDoc.saveAsBase64({ dataUri: true }))
            .then(pdfDataUri => {
                const b64 = pdfDataUri.split("base64,")[1];
                uploadToServer(b64, 'application/pdf', 'captured_images.pdf', Date.now());
            })
            .catch(error => {
                msg.innerHTML = `Erro ao converter imagens para PDF.`;
                console.error('Error:', error);
            });
    };
});
