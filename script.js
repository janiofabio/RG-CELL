document.addEventListener('DOMContentLoaded', () => {
    const api = "https://script.google.com/macros/s/AKfycbxGgPnMwV7MLIyhTfPIYqXbRA4-e6RJ8JGfF22h6dfkHH_m-slT6wC2GrsBfuxajhUD/exec";
    const msg = document.querySelector(".message");
    const fileInput = document.querySelector(".file");
    const btn = document.querySelector(".btn");
    const captureBtn = document.querySelector(".capture-btn");
    const snapBtn = document.querySelector(".snap-btn");
    const progressBarFill = document.querySelector(".progress-bar-fill");
    const progressInfo = document.querySelector(".progress-info");
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    let capturedImage = null;

    // Detect if the user is on a mobile device
    const isMobileDevice = () => {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    if (isMobileDevice()) {
        captureBtn.style.display = 'block';
    }

    // Process PDF file
    btn.addEventListener('click', () => {
        if (capturedImage) {
            processImage(capturedImage);
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

    // Capture image from rear camera
    captureBtn.addEventListener('click', async () => {
        const constraints = {
            video: {
                facingMode: { exact: "environment" } // Use rear camera
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.style.display = 'block';
            snapBtn.style.display = 'block';
            video.srcObject = stream;
        } catch (error) {
            console.error("Error accessing the camera: ", error);
            alert("Erro ao acessar a câmera traseira. Por favor, verifique as permissões.");
        }
    });

    // Snap photo
    snapBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage = canvas.toDataURL('image/png');
        downloadImage(capturedImage, 'captured_image.png');
        video.style.display = 'none';
        snapBtn.style.display = 'none';
        video.srcObject.getTracks().forEach(track => track.stop());
    });

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

    // Function to process image data URL
    const processImage = (dataUrl) => {
        let b64 = dataUrl.split("base64,")[1];
        uploadToServer(b64, 'image/png', 'captured_image.png', Date.now());
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
                file: b64,
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

    // Function to download captured image
    const downloadImage = (dataUrl, filename) => {
        let a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
});
