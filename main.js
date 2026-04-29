import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

class DNAViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020209);

        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 220);
        this.camera.position.set(0, 20, 48);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.12;
        this.controls.enablePan = false;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 70;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.4;
        this.controls.screenSpacePanning = false;

        this.targetZoom = this.camera.position.length();
        this.baseMeshes = [];
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.dragging = false;

        this.initLights();
        this.createDNA();
        this.setupInteraction();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0x4d5871, 0.7);
        this.scene.add(ambient);

        const hemisphere = new THREE.HemisphereLight(0x5f6575, 0x0b0d12, 0.35);
        this.scene.add(hemisphere);

        const keyLight = new THREE.DirectionalLight(0xe7e5dc, 0.8);
        keyLight.position.set(-16, 18, 26);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x8890a0, 0.35);
        fillLight.position.set(14, -8, -14);
        this.scene.add(fillLight);
    }

    createDNA() {
        const colors = {
            A: 0x32cd32,
            T: 0xff4500,
            C: 0xffd700,
            G: 0x00ced1,
            Phosphate: 0xa87dff,
            Sugar: 0xb2b2bd,
            Bond: 0x7d8ea5,
            Hbonds: 0x79b4ff
        };

        const textData = {
            A: { label: '腺嘌呤 (A)', desc: 'A是嘌呤碱基，与胸腺嘧啶(T)形成双氢键配对。颜色为绿色，形状为锥体。' },
            T: { label: '胸腺嘧啶 (T)', desc: 'T是嘧啶碱基，与腺嘌呤(A)配对，图示为橙红色环形结构。' },
            C: { label: '胞嘧啶 (C)', desc: 'C是嘧啶碱基，与鸟嘌呤(G)配对，颜色为金黄色，形状为八面体。' },
            G: { label: '鸟嘌呤 (G)', desc: 'G是嘌呤碱基，与胞嘧啶(C)配对，颜色为青色，形状为十二面体。' },
            Phosphate: { label: '磷酸基团', desc: '磷酸基团连接脱氧核糖，形成DNA骨架，是磷酸二酯键的重要组成部分。' },
            Sugar: { label: '脱氧核糖', desc: '脱氧核糖是DNA骨架的糖部分，与磷酸基团交替形成磷酸二酯键。' },
            Bond: { label: '磷酸二酯键', desc: '磷酸二酯键连接相邻核苷酸，是DNA骨架稳定性的关键作用力。' },
            Hbonds: { label: '碱基对氢键', desc: '碱基对之间通过氢键相连，确保A-T和C-G配对的稳定性。' }
        };

        const helixGroup = new THREE.Group();

        for (let i = 0; i < 24; i++) {
            const angle = i * 0.46;
            const y = (i - 11.5) * 1.8;
            const radiusBackbone = 5.8;
            const radiusBase = 1.2;

            const p1 = new THREE.Vector3(Math.cos(angle) * radiusBackbone, y, Math.sin(angle) * radiusBackbone);
            const p2 = new THREE.Vector3(Math.cos(angle + Math.PI) * radiusBackbone, y, Math.sin(angle + Math.PI) * radiusBackbone);
            const sugar1 = new THREE.Vector3(Math.cos(angle) * (radiusBackbone - 1.2), y, Math.sin(angle) * (radiusBackbone - 1.2));
            const sugar2 = new THREE.Vector3(Math.cos(angle + Math.PI) * (radiusBackbone - 1.2), y, Math.sin(angle + Math.PI) * (radiusBackbone - 1.2));
            const base1Pos = new THREE.Vector3(Math.cos(angle) * radiusBase, y, Math.sin(angle) * radiusBase);
            const base2Pos = new THREE.Vector3(Math.cos(angle + Math.PI) * radiusBase, y, Math.sin(angle + Math.PI) * radiusBase);

            const baseType = Math.random() > 0.5 ? ['A', 'T'] : ['C', 'G'];
            const [type1, type2] = baseType;

            const phosphate1 = this.createSphere(p1, 0.46, colors.Phosphate, textData.Phosphate);
            const phosphate2 = this.createSphere(p2, 0.46, colors.Phosphate, textData.Phosphate);
            const sugarMesh1 = this.createPentagonSugar(sugar1, colors.Sugar, textData.Sugar, angle);
            const sugarMesh2 = this.createPentagonSugar(sugar2, colors.Sugar, textData.Sugar, angle + Math.PI);

            helixGroup.add(phosphate1, phosphate2, sugarMesh1, sugarMesh2);

            helixGroup.add(this.createCurvedBond(p1, sugar1, colors.Bond, textData.Bond, 0.12, 0.35));
            helixGroup.add(this.createCurvedBond(p2, sugar2, colors.Bond, textData.Bond, 0.12, 0.35));
            helixGroup.add(this.createCurvedBond(sugar1, base1Pos, colors.Bond, textData.Bond, 0.1, 0.22));
            helixGroup.add(this.createCurvedBond(sugar2, base2Pos, colors.Bond, textData.Bond, 0.1, 0.22));
            helixGroup.add(this.createHBond(base1Pos, base2Pos, colors.Hbonds, textData.Hbonds));

            const base1 = this.createBase(base1Pos, colors[type1], textData[type1], type1, 1);
            const base2 = this.createBase(base2Pos, colors[type2], textData[type2], type2, -1);
            helixGroup.add(base1, base2);
        }

        this.scene.add(helixGroup);
        this.scene.add(this.createVerticalGuide());
    }

    createSphere(position, radius, color, labelData) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 26, 26), new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.72 }));
        mesh.position.copy(position);
        mesh.userData = { title: labelData.label, desc: labelData.desc };
        mesh.name = labelData.label;
        return mesh;
    }

    createPentagonSugar(position, color, labelData, rotationY) {
        const geometry = new THREE.CylinderGeometry(0.68, 0.68, 0.32, 5, 1, false);
        const material = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.78 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.y = rotationY + Math.PI / 5;
        mesh.userData = { title: labelData.label, desc: labelData.desc };
        mesh.name = labelData.label;
        return mesh;
    }

    createCurvedBond(start, end, color, labelData, radius = 0.12, bendFactor = 0.16) {
        const distance = start.distanceTo(end);
        const tangent = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        let bendDir = new THREE.Vector3().crossVectors(tangent, up);
        if (bendDir.lengthSq() < 0.001) bendDir.set(1, 0, 0);
        bendDir.normalize();
        const side = start.x >= 0 ? 1 : -1;
        bendDir.multiplyScalar(distance * bendFactor * side);

        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const control = mid.clone().add(bendDir);
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        const geometry = new THREE.TubeGeometry(curve, 28, radius, 12, false);
        const material = new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.82 });
        const tube = new THREE.Mesh(geometry, material);
        tube.userData = { title: labelData.label, desc: labelData.desc };
        tube.name = labelData.label;
        return tube;
    }

    createHBond(base1Pos, base2Pos, color, labelData) {
        const points = [base1Pos, base2Pos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({ color, dashSize: 0.4, gapSize: 0.2, linewidth: 1.2, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        line.userData = { title: labelData.label, desc: labelData.desc };
        line.name = labelData.label;
        return line;
    }

    createBase(position, color, labelData, type, side) {
        const geometry = this.createBasePlateGeometry(type, side);
        const mat = new THREE.MeshStandardMaterial({ color, emissive: 0x000000, metalness: 0.02, roughness: 0.78 });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.copy(position);
        mesh.userData = { title: labelData.label, desc: labelData.desc };
        mesh.name = labelData.label;
        mesh.scale.setScalar(0.96);

        mesh.rotation.x = Math.PI / 2;
        this.baseMeshes.push(mesh);
        return mesh;
    }

    createBasePlateGeometry(type, side) {
        const width = 1.0;
        const depth = 2.2;
        const lip = 0.18;
        const thickness = 0.14;
        const isConvex = type === 'A' || type === 'G';

        const halfW = width / 2;
        const halfD = depth / 2;
        const innerEdge = side > 0 ? -halfW : halfW;
        const outerEdge = -innerEdge;
        const dir = side > 0 ? 1 : -1;

        const shape = new THREE.Shape();
        if (isConvex) {
            shape.moveTo(innerEdge, -halfD);
            shape.lineTo(outerEdge, -halfD);
            shape.lineTo(outerEdge, halfD);
            shape.lineTo(innerEdge, halfD);
            shape.lineTo(innerEdge, lip);
            shape.lineTo(innerEdge - dir * lip, lip);
            shape.lineTo(innerEdge - dir * lip, -lip);
            shape.lineTo(innerEdge, -lip);
            shape.lineTo(innerEdge, -halfD);
        } else {
            shape.moveTo(innerEdge, -halfD);
            shape.lineTo(outerEdge, -halfD);
            shape.lineTo(outerEdge, halfD);
            shape.lineTo(innerEdge, halfD);
            shape.lineTo(innerEdge, lip);
            shape.lineTo(innerEdge + dir * lip, lip);
            shape.lineTo(innerEdge + dir * lip, -lip);
            shape.lineTo(innerEdge, -lip);
            shape.lineTo(innerEdge, -halfD);
        }

        const extrudeSettings = { depth: thickness, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -thickness / 2);
        return geometry;
    }

    createVerticalGuide() {
        const points = [
            new THREE.Vector3(0, -160, 0),
            new THREE.Vector3(0, 160, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({ color: 0x4d5460, dashSize: 3, gapSize: 3, transparent: true, opacity: 0.18 });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        return line;
    }

    setupInteraction() {
        const infoCard = document.getElementById('card');
        const titleEl = document.getElementById('c-title');
        const descEl = document.getElementById('c-desc');

        window.addEventListener('pointerdown', () => {
            this.dragging = true;
        });
        window.addEventListener('pointerup', () => {
            this.dragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
        });

        window.addEventListener('click', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0 && intersects[0].object.userData.title) {
                const data = intersects[0].object.userData;
                titleEl.innerText = data.title;
                descEl.innerText = data.desc;
                infoCard.style.display = 'block';
            } else {
                infoCard.style.display = 'none';
            }
        });

        window.addEventListener('wheel', (event) => {
            event.preventDefault();
            const delta = Math.sign(event.deltaY) * 1.6;
            const minZ = 18;
            const maxZ = 72;
            this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + delta, minZ - 5, maxZ + 5);
        }, { passive: false });
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const currentDistance = this.camera.position.length();
        const eased = THREE.MathUtils.lerp(currentDistance, this.targetZoom, 0.06);
        const limited = THREE.MathUtils.clamp(eased, 18, 72);
        this.camera.position.setLength(limited);

        this.baseMeshes.forEach((mesh, index) => {
            const wobble = 1 + Math.sin((performance.now() * 0.001) + index) * 0.03;
            mesh.scale.setScalar(0.96 * wobble);
        });

        if (!this.dragging) {
            this.controls.autoRotate = true;
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new DNAViewer();