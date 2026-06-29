<!-- ==================================================================================================== -->
<!-- NEUROEDGE VISION -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">NeuroEdge Vision: Real-Time Neuromorphic Perception for Edge AI on Raspberry Pi 5 using Event-Based Cameras</strong></p>

<img src="/static/assets/img/Neuro-Edge.gif" alt="NeuroEdge Vision Demo" width="600"/>

<p><strong>Project Description:</strong><br>
In this project, we develop a real-time neuromorphic vision framework for edge AI deployment on Raspberry Pi 5 using event-based cameras (Prophesee GenX series). The system is designed for low-latency, power-efficient perception in unconstrained environments, enabling continuous human-centric scene understanding directly on embedded hardware.</p>

<p>The pipeline combines event-driven sensing with lightweight deep learning models for detection and tracking, integrated with motion-aware analysis for activity understanding. A CMOS RGB stream is optionally fused for auxiliary pose estimation, enabling hybrid event–frame perception without increasing system latency significantly.</p>

<p>The framework is optimized for deployment on Raspberry Pi 5 using ONNX/TensorRT-style lightweight inference paths and demonstrates robust performance for real-time tracking, motion analysis, and activity recognition in dynamic indoor environments. The system highlights the potential of neuromorphic sensing for privacy-preserving, low-power, and adaptive intelligent perception systems suitable for robotics, smart surveillance, and human–machine interaction.</p>

*   [[Project Website](https://mali-farooq.github.io/NeuroVision/)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- THERMVISION -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">ThermVision: Exploring FLUX for Synthesizing Hyper-Realistic Thermal Face Data and Animations via Image to Video Translation</strong></p>

<img src="/static/assets/img/ThermVision.gif" alt="ThermVision Demo" width="600"/>

<p><strong>Project Description:</strong><br>
In this project, we introduce a fully synthetic thermal facial dataset “ThermVision”, created using a custom FLUX-based diffusion pipeline combined with a video retargeting module that accurately transfers dynamic expressions and head pose variations into the thermal domain. This approach eliminates the need for costly and privacy-sensitive thermal video collection while maintaining realism and structural consistency.</p>

<p>The dataset includes high-resolution thermal sequences of synthetic male and female subjects, with extreme headpose and expressions, and annotated facial landmarks, making it highly useful for benchmarking and training in tasks like thermal face detection, expression recognition, and privacy-preserving biometrics.</p>

*   [[Project Website](https://lnkd.in/eH-5u2qd)]
*   [[ThermVision FLUX LoRA Weights](https://lnkd.in/eJEeaeC7)]
*   [[ThermVision Dataset](https://lnkd.in/e-WRZNmk)]
*   [[GitHub Repository](https://github.com/MAli-Farooq/ThermVision)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- DERM-T2IM -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">Derm-T2IM</strong></p>

<img src="/static/assets/img/DermT2IM.png" alt="Derm-T2IM Block Diagram" width="600"/>

<p><strong>Project Description:</strong><br>
Generating synthetic skin lesion images using Stable Diffusion models is an innovative approach to augmenting dermatological datasets for research and clinical purposes. By leveraging the advanced capabilities of Stable Diffusion, the tuned Derm-T2IM model creates high-quality, realistic skin lesion images that can be used to train and improve machine learning models for skin cancer detection and other dermatological conditions. This technique enhances data diversity, mitigates the challenges of limited access to medical data, and preserves patient privacy. Our GitHub repository provides detailed instructions, pre-trained models, and sample scripts to facilitate the generation of synthetic skin lesion images, enabling researchers and practitioners to advance their work with robust and varied datasets.</p>

<p>The complete project description, models and dataset can be found and cloned from below provided links.</p>

*   [[Paper](https://arxiv.org/abs/2401.05159)]
*   [[GitHub Page](https://github.com/MAli-Farooq/Derm-T2IM)]
*   [[Derm-T2IM Model](https://huggingface.co/MAli-Farooq/Derm-T2IM)]
*   [[Derm-T2IM Dataset](https://huggingface.co/datasets/MAli-Farooq/Derm-T2IM-Dataset)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- CHILDDIFFUSION -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">ChildDiffusion</strong></p>

<img src="/static/assets/img/Child-Figure-Block-Diagram.png" alt="ChildDiffusion Block Diagram" width="600"/>

<p><strong>Project Description:</strong><br>
Rendering high quality synthetic child images using Stable Diffusion along with controlled augmentations and large language models offers a novel and ethical approach to creating diverse and high-quality images for various applications, such as training machine learning models or developing child-oriented content. This project harnesses the power of Stable Diffusion to produce realistic images of children with a variety of smart transformations such as distinct facial expressions, child aging, various lighting conditions, child race data, face pose variations, multiple subjects etc. The overall system is tuned using synthetic data generated via ChildGAN without the need for real-world data, thereby addressing privacy concerns and ensuring the safety of minors. The GitHub repository provides comprehensive resources, including pre-trained models, detailed instructions, and sample scripts, to streamline the process of generating synthetic child images. By utilizing this technology, researchers and developers can access a vast array of images that enhance the performance and accuracy of their projects while adhering to ethical standards.</p>

*   [[Paper](https://arxiv.org/abs/2406.11592)]
*   [[Project Website Page](https://mali-farooq.github.io/childdiffusion/)]
*   [[ChildDiffusion Model](https://huggingface.co/MAli-Farooq/ChildDiffusion/tree/main)]
*   [[ChildDiffusion Sample Race Dataset](https://huggingface.co/datasets/MAli-Farooq/ChildDiffusion_Race_Dataset)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- CHILDGAN -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">ChildGAN</strong></p>

<img src="/static/assets/img/ChildGANBD.png" alt="ChildGAN Block Diagram" width="600"/>

<p><strong>Project Description:</strong><br>
Generating synthetic child images using Generative Adversarial Networks (GANs) represents a cutting-edge solution for creating diverse and high-quality datasets for research and application development. This project leverages advanced GAN models which mainly include StyleGAN2 to produce realistic images of children, which can be instrumental in training and evaluating machine learning algorithms, especially in scenarios where obtaining real-world data is challenging due to privacy and ethical concerns. This approach ensures the protection of minors' identities while providing robust data for enhancing model performance. The generated data comprises over 300,000 distinct samples, featuring a wide range of variations such as facial expressions, age progression, eye blink effects, head poses, skin and hair color differences, and varying lighting conditions. Our GitHub repository includes pre-trained GAN models, detailed usage instructions, and further provides access to the complete dataset as a resource to use our synthetic child images efficiently. By utilizing these resources, developers and researchers can access a wide variety of images that meet ethical standards and significantly contribute to the advancement of their projects.</p>

*   [[Paper](https://ieeexplore.ieee.org/abstract/document/10268402)]
*   [[Project Website Page](https://mali-farooq.github.io/childgan/)]
*   [[GitHub Page](https://github.com/MAli-Farooq/ChildGAN)]
*   [[ChildGAN Model](https://drive.google.com/drive/folders/1JtLsueTcNOXfmCv76Y78YRu-Q38NfTAL?usp=share_link)]
*   [[ChildGAN Sample Dataset](https://drive.google.com/drive/folders/1QPTI9Sd4TXTcQWbTEojv6pdWBxlVd1n1?usp=share_link)]
*   [[ChildGAN Full Dataset](https://drive.google.com/drive/folders/1QPTI9Sd4TXTcQWbTEojv6pdWBxlVd1n1?usp=share_link)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- THERMAL SENSING FOR ADAS -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">Thermal Sensing for ADAS</strong></p>

<img src="/static/assets/img/OD-3.png" alt="Thermal Detection Sample 1" width="600"/>
<img src="/static/assets/img/OD-2.png" alt="Thermal Detection Sample 2" width="600"/>

<p><strong>Project Description:</strong><br>
As part of my PhD research carried out under the HELIAUS EU Project, I focused on enhancing situational awareness for drivers through the integration of thermal object detection technology. Keeping this in view, I have worked on thermal object detection and sensing for advanced vehicular systems. Here, I utilize YOLOv5 and YOLOv7 to detect seven different classes within the thermal spectrum, significantly enhancing the safety and performance of modern vehicles. This project focuses on developing and implementing robust detection algorithms tailored for thermal imaging, enabling reliable identification of pedestrians, animals, moving vehicles, and other obstacles in low-visibility conditions. By performing the robust fine-tuning of an End-to-End CNN, I was able to achieve a maximum mean average precision (mAP) of 91.29%. The below links provide access to the complete study, code samples, and tuned thermal models, thus providing insights into how thermal sensing can revolutionize vehicular safety.</p>

*   [[Project Website](https://mali-farooq.github.io/IRVehicleVision/)]
*   [[Paper](https://ieeexplore.ieee.org/document/9618926)]
*   [[GitHub Page](https://github.com/MAli-Farooq/Thermal-YOLO)]
*   [[Tuned Thermal Object Detection Models](https://huggingface.co/MAli-Farooq/Thermal_Object_Detection)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- SMART THERMAL IMAGING PIPELINES -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">Deployment of Smart Thermal Imaging Pipelines on Edge Computing Boards</strong></p>

<img src="/static/assets/img/jetson.gif" alt="Jetson Nano Deployment" width="600"/>
<img src="/static/assets/img/thermalinf.gif" alt="Thermal Inference Real-time" width="600"/>

<p><strong>Project Description:</strong><br>
In this project, I have deployed optimized thermal object detection networks using model quantization methods, TensorRT, and TensorFlow Lite inference accelerator tools on Nvidia Jetson Nano, Nvidia Jetson Xavier, and Raspberry Pi boards. The deployment on the Jetson Xavier achieved the fastest inference rate, reaching 60 FPS. Furthermore, the deployed optimized model was validated on a locally acquired C3I Thermal Automotive Dataset with an overall mAP of 71.9%. The complete details can be found in the below links.</p>

*   [[Paper 1](https://ieeexplore.ieee.org/abstract/document/9732195)]
*   [[Paper 2](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/12701/1270102/Development-optimization-and-deployment-of-thermal-forward-vision-systems-for/10.1117/12.2679749.short?webSyncID=2aed2ae2-d3d9-a151-5256-2751232bb40e&sessionGUID=7a253586-9206-e7da-04ee-b52c86137086)]
*   [[GitHub Page](https://github.com/MAli-Farooq/Thermal-YOLO-And-Model-Optimization-Using-TensorFlowLite?tab=readme-ov-file)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- GENDER CLASSIFICATION SYSTEM -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">Autonomous Thermal Gender Classification System</strong></p>

<img src="/static/assets/img/Gender.png" alt="Thermal Gender Features" width="600"/>
<img src="/static/assets/img/gendertestacc.png" alt="Model Training Accuracy Graph" width="600"/>

<p><strong>Project Description:</strong><br>
I proposed an autonomous thermal gender classification system using LWIR thermal imaging for in-cabin driver monitoring systems. This work was part of my Ph.D. research, where I employed transfer learning to fine-tune nine state-of-the-art end-to-end CNN models, including ResNet-50, ResNet-101, Inception-V3, MobileNet-V2, VGG-19, AlexNet, DenseNet-121, DenseNet-201, and EfficientNet-B4. Additionally, I developed a novel CNN architecture called GENNET, which was trained and validated for binary thermal gender classification, achieving an overall accuracy of 91.1% when compared with other pre-trained CNN models.</p>

*   [[Paper](https://www.spiedigitallibrary.org/journals/journal-of-electronic-imaging/volume-29/issue-06/063004/Performance-estimation-of-the-state-of-the-art-convolution-neural/10.1117/1.JEI.29.6.063004.full#_=_)]
*   [[GitHub Repository](https://github.com/MAli-Farooq/Gender-Classification-Using-Thermal-Data)]

<br>
<br>

<!-- ==================================================================================================== -->
<!-- DIGITAL INCUBATOR -->
<!-- ==================================================================================================== -->
<p><strong style="color: #FF6600; font-style: italic; font-size: 1.2em;">Digital Incubator using Arduino Controller</strong></p>

<img src="/static/assets/img/ar2.PNG" alt="Arduino Setup View" width="600"/>
<img src="/static/assets/img/ar1.PNG" alt="Incubator Hardware Casing" width="600"/>

<p><strong>Project Description:</strong><br>
Incubators are very important for many experimental works in the field of cell biology, microbiology as well as molecular biology, and cultures are used for bacteria and other Eukaryota cells. In this project, I have designed an egg incubator that monitors and controls temperature as well as lighting in the desired or optimum range required for proper hatching as a primary task. This research project was carried out as part of my final year project where I used an Arduino controller along with various sensors, including temperature and light sensors. For automating the whole process, I utilized if-else logic and PID controller methodologies.</p>

*   [[Project Details](https://www.instructables.com/Digital-Incubator-using-Arduino/)]
*   [[PDF Document](https://drive.google.com/file/d/1qxNhCMA9MgBMe_DhpXfU4U1i-tiNpoZU/view?usp=drive_link)]
