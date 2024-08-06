- <strong>Derm-T2IM </strong>

<img src="/static/assets/img/Derm-T2IM.png" alt="drawing" width="600"/>

Project Description: Generating synthetic skin lesion images using Stable Diffusion models is an innovative approach to augmenting dermatological datasets for research and clinical purposes. By leveraging the advanced capabilities of Stable Diffusion, the tuned Derm-T2IM model creates high-quality, realistic skin lesion images that can be used to train and improve machine learning models for skin cancer detection and other dermatological conditions. This technique enhances data diversity, mitigates the challenges of limited access to medical data, and preserves patient privacy. Our GitHub repository provides detailed instructions, pre-trained models, and sample scripts to facilitate the generation of synthetic skin lesion images, enabling researchers and practitioners to advance their work with robust and varied datasets.
The complete project desciption, models and dataset can be found and cloned from below provided links.

Links: </strong> [[Paper]](https://arxiv.org/abs/2401.05159)  </strong> [[Github-Page]](https://github.com/MAli-Farooq/Derm-T2IM)  </strong> [[Derm-T2IM Model]](https://huggingface.co/MAli-Farooq/Derm-T2IM)  </strong> [[Derm-T2IM Dataset]](https://huggingface.co/datasets/MAli-Farooq/Derm-T2IM-Dataset)


<br>
<br>

- <strong>ChildDiffusion </strong>

<img src="/static/assets/img/Child-Figure-Block-Diagram.png" alt="drawing" width="600"/>

Project Description: Rendering high quality synthetic child images using Stable Diffusion along with controlled augmentations and large langauge models offers a novel and ethical approach to creating diverse and high-quality images for various applications, such as training machine learning models or developing child-oriented content. This project harnesses the power of Stable Diffusion to produce realistic images of children with variety of smart transformations such that distinct facial expressions, child aging, various lighting conditions, chld race data, face pose varitions, multiple subject etc. The overall system is tuned using synthetic data generated via ChildGAN without the need for real-world data, thereby addressing privacy concerns and ensuring the safety of minors. The GitHub repository provides comprehensive resources, including pre-trained models, detailed instructions, and sample scripts, to streamline the process of generating synthetic child images. By utilizing this technology, researchers and developers can access a vast array of images that enhance the performance and accuracy of their projects while adhering to ethical standards.

Links: </strong> [[Paper]](https://arxiv.org/abs/2406.11592)  </strong> [[Project Website Page]](https://mali-farooq.github.io/childdiffusion/)  </strong> [[ChildDiffusion Model]](https://huggingface.co/MAli-Farooq/ChildDiffusion/tree/main)  </strong> [[ChildDiffusion Sample Race Dataset]](https://huggingface.co/datasets/MAli-Farooq/ChildDiffusion_Race_Dataset)
 
-  <strong>ChildGAN </strong>

<img src="/static/assets/img/3.png" alt="drawing" width="600"/>

Generating synthetic child images using Generative Adversarial Networks (GANs) represents a cutting-edge solution for creating diverse and high-quality datasets for research and application development. This project leverages advanced GAN models which mainly includes StyleGAN2 to produce realistic images of children, which can be instrumental in training and evaluating machine learning algorithms, especially in scenarios where obtaining real-world data is challenging due to privacy and ethical concerns. This approach ensures the protection of minors' identities while providing robust data for enhancing model performance. The generated data comprises over 300,000 distinct samples, featuring a wide range of variations such as facial expressions, age progression, eye blink effects, head poses, skin and hair color differences, and varying lighting conditions. Our GitHub repository includes pre-trained GAN models, detailed usage instructions, and further provide access to complete dataset as a resource to use our synthetic child images efficiently. By utilizing these resources, developers and researchers can access a wide variety of images that meet ethical standards and significantly contribute to the advancement of their projects.

Links: </strong> [[Paper]](https://ieeexplore.ieee.org/abstract/document/10268402)  </strong> [[Project Website Page]](https://mali-farooq.github.io/childgan/)  </strong> [[Github-Page]](https://github.com/MAli-Farooq/ChildGAN) </strong> [[ChildGAN Model]](https://drive.google.com/drive/folders/1JtLsueTcNOXfmCv76Y78YRu-Q38NfTAL?usp=share_link)  </strong> [[ChildGAN Sample Dataset]](https://drive.google.com/drive/folders/1QPTI9Sd4TXTcQWbTEojv6pdWBxlVd1n1?usp=share_link) </strong> [[ChildGAN Full Dataset]](https://drive.google.com/drive/folders/1QPTI9Sd4TXTcQWbTEojv6pdWBxlVd1n1?usp=share_link)

-  <strong>Thermal Sensing for ADAS </strong>

<img src="/static/assets/img/OD-3.png" alt="drawing" width="600"/>
<img src="/static/assets/img/OD-2.png" alt="drawing" width="600"/>


As part of my PhD research carried under the HELIAUS EU Project, I focused on enhancing situational awareness for drivers through the integration of thermal object detection technology. Keeping this in view I have wokred on thermal object detection and sensing for advanced vehicular systems. Here, I utilize YOLO-V5, and YOLO-V7 to detect seven different classes within the thermal spectrum, significantly enhancing the safety and performance of modern vehicles. This project focuses on developing and implementing robust detection algorithms tailored for thermal imaging, enabling reliable identification of pedestrians, animals, moving vehicles, and other obstacles in low-visibility conditions. By performing the robust fine-tuning of End-to-END CNN I was to acvive the maximum mean average precesion (mAP) of 91.29%. The below links provide access to complete study, code samples, and tuned thermal models thus providing insights into how thermal sensing can revolutionize vehicular safety.

Links: </strong> [[Paper]](https://ieeexplore.ieee.org/document/9618926)  </strong> [[Github Page]](https://github.com/MAli-Farooq/Thermal-YOLO)  </strong> [[Tuned Thermal Object Detection Models]](https://huggingface.co/MAli-Farooq/Thermal_Object_Detection)


- <strong>Deployment of Smart Thermal Imaging Pipelines on Edge Computing Boards </strong>

<img src="/static/assets/img/jetson.gif" alt="drawing" width="600"/>
<img src="/static/assets/img/thermalinf.gif" alt="drawing" width="600"/>

In this project I have deployed optimized thermal object detection networks using model quantization methods, TensorRT, and TensorFlow Lite inference accelerator tools on Nvidia Jetson Nano, Nvidia Jetson Xavier, and Raspberry Pi boards. The deployment on the Jetson Xavier achieved the fastest inference rate, reaching 60 FPS. Further the deployed optimzied model was validated on locally acquired C3I THERMAL AUTOMOTIVE DATASET with overall mAP of 71.9%. The complete details can be found in below links.

Links: </strong> [[Paper]](https://ieeexplore.ieee.org/abstract/document/9732195) </strong> [[Paper]](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/12701/1270102/Development-optimization-and-deployment-of-thermal-forward-vision-systems-for/10.1117/12.2679749.short?webSyncID=2aed2ae2-d3d9-a151-5256-2751232bb40e&sessionGUID=7a253586-9206-e7da-04ee-b52c86137086) [[Github Page]](https://github.com/MAli-Farooq/Thermal-YOLO-And-Model-Optimization-Using-TensorFlowLite?tab=readme-ov-file)
 
- <strong>Autonomous Thermal Gender Classification System </strong>

<img src="/static/assets/img/Gender.png" alt="drawing" width="600"/>
<img src="/static/assets/img/gendertestacc.png" alt="drawing" width="600"/>

I proposed an autonomous thermal gender classification system using LWIR thermal imaging for in-cabin driver monitoring systems. This work was part of my Ph.D. research, where I employed transfer learning to fine-tune nine state-of-the-art end-to-end CNN models, including ResNet-50, ResNet-101, Inception-V3, MobileNet-V2, VGG-19, AlexNet, DenseNet-121, DenseNet-201, and EfficientNet-B4. Additionally, I developed a novel CNN architecture called GENNET, which was trained and validated for binary thermal gender classification, achieving an overall accuracy of 91.1% when compared with other pre-trained CNN models. 

Links: </strong> [[Paper]](https://www.spiedigitallibrary.org/journals/journal-of-electronic-imaging/volume-29/issue-06/063004/Performance-estimation-of-the-state-of-the-art-convolution-neural/10.1117/1.JEI.29.6.063004.full#_=_) </strong> [[Github Repository]](https://github.com/MAli-Farooq/Gender-Classification-Using-Thermal-Data)

- <strong>Digital Incubator using Arduino Controller </strong>

Incubators are very important for many experimental works in the field of cell biology, microbiology as well as molecular biology and cultures are used for the bacteria and other Eukaryota cells. In this project I have designed an egg incubator that monitors and control the temperature as well as lightness in the desired or optimum range required for the proper hatching of eggs as a primary task. This research project was carried as part of my final year project where I used Arduino controller along with various sensors which includes temepraturer and light sensors. For automating the whole process I have utilized if-else and PID controller methodlogy.

Links: </strong> [[Project Details]](https://www.instructables.com/Digital-Incubator-using-Arduino/)
