"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import ControlPanel from "./control-panel";
import InfoPanel from "./info-panel";
import Tooltip from "./tooltip";

interface CountryInfo {
  name: string;
  code: string;
  region: string;
  population: number;
  gdp: number;
}

interface SubfieldData {
  id?: string;
  name: string;
  works_count: number;
  topics: Array<{ id?: string; name: string; works_count: number }>;
}

interface CountryResearchData {
  subfields: SubfieldData[];
}

export default function GlobeVisualization() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const countryFillsGroupRef = useRef<THREE.Group | null>(null);
  const bordersGroupRef = useRef<THREE.Group | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: "",
  });
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [countryData, setCountryData] = useState<CountryResearchData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingCountryData, setLoadingCountryData] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [showAtmosphere, setShowAtmosphere] = useState(true);

  const countryDataMapRef = useRef<Map<string, CountryInfo>>(new Map());
  const borderLinesRef = useRef<any[]>([]);
  const countryMeshesRef = useRef<any[]>([]);
  const stateRef = useRef({
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    mouseDownPosition: { x: 0, y: 0 },
  });

  const RADIUS = 2;
  const SEGMENTS = 64;
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const BORDER_COLORS = [
    0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0x6c5ce7, 0xa29bfe, 0xfd79a8,
    0xfdcb6e, 0xe17055, 0x00b894,
  ];

  // Comprehensive country name to code mapping for all countries with data
  const countryNameToCode: { [key: string]: string } = {
    // United States variations
    "united states": "US",
    "united states of america": "US",
    usa: "US",
    "u.s.a.": "US",
    "u.s.a": "US",
    us: "US",
    // Canada
    canada: "CA",
    // Mexico
    mexico: "MX",
    // United Kingdom
    "united kingdom": "GB",
    uk: "GB",
    "great britain": "GB",
    // European countries
    france: "FR",
    germany: "DE",
    "germany, federal republic of": "DE",
    italy: "IT",
    spain: "ES",
    poland: "PL",
    netherlands: "NL",
    belgium: "BE",
    greece: "GR",
    portugal: "PT",
    austria: "AT",
    switzerland: "CH",
    sweden: "SE",
    norway: "NO",
    denmark: "DK",
    finland: "FI",
    ireland: "IE",
    "czech republic": "CZ",
    hungary: "HU",
    romania: "RO",
    bulgaria: "BG",
    croatia: "HR",
    serbia: "RS",
    slovenia: "SI",
    slovakia: "SK",
    estonia: "EE",
    latvia: "LV",
    lithuania: "LT",
    iceland: "IS",
    cyprus: "CY",
    // Asian countries
    china: "CN",
    "people's republic of china": "CN",
    japan: "JP",
    india: "IN",
    "south korea": "KR",
    korea: "KR",
    "republic of korea": "KR",
    indonesia: "ID",
    thailand: "TH",
    malaysia: "MY",
    singapore: "SG",
    philippines: "PH",
    vietnam: "VN",
    "hong kong": "HK",
    taiwan: "TW",
    pakistan: "PK",
    bangladesh: "BD",
    kazakhstan: "KZ",
    uzbekistan: "UZ",
    tajikistan: "TJ",
    // Middle East
    "united arab emirates": "AE",
    uae: "AE",
    "saudi arabia": "SA",
    turkey: "TR",
    jordan: "JO",
    kuwait: "KW",
    // Africa
    "south africa": "ZA",
    egypt: "EG",
    nigeria: "NG",
    kenya: "KE",
    ethiopia: "ET",
    morocco: "MA",
    tunisia: "TN",
    cameroon: "CM",
    // Americas
    brazil: "BR",
    argentina: "AR",
    chile: "CL",
    colombia: "CO",
    peru: "PE",
    venezuela: "VE",
    ecuador: "EC",
    "puerto rico": "PR",
    panama: "PA",
    // Oceania
    australia: "AU",
    "new zealand": "NZ",
    // Eastern Europe / Central Asia
    russia: "RU",
    "russian federation": "RU",
    ukraine: "UA",
    belarus: "BY",
    mongolia: "MN",
    macao: "MO",
    macau: "MO",
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Create starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorVariation = 0.7 + Math.random() * 0.3;
      colors[i3] = colorVariation;
      colors[i3 + 1] = colorVariation;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;

      sizes[i] = Math.random() * 2;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
    starfieldRef.current = starfield;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create globe (ocean)
    const globeGeometry = new THREE.SphereGeometry(RADIUS, SEGMENTS, SEGMENTS);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a3a52,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
      side: THREE.DoubleSide,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    // Create atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(
      RADIUS * 1.18,
      SEGMENTS,
      SEGMENTS
    );
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.visible = true;
    scene.add(atmosphere);
    atmosphereRef.current = atmosphere;

    // Create groups
    const countryFillsGroup = new THREE.Group();
    scene.add(countryFillsGroup);
    countryFillsGroupRef.current = countryFillsGroup;

    const bordersGroup = new THREE.Group();
    scene.add(bordersGroup);
    bordersGroupRef.current = bordersGroup;

    // Load country borders
    loadCountryBorders(scene, camera, renderer);

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      stateRef.current.mouseDownPosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isDragging) {
        const deltaX = e.clientX - stateRef.current.previousMousePosition.x;
        const deltaY = e.clientY - stateRef.current.previousMousePosition.y;
        [globe, countryFillsGroup, bordersGroup, atmosphere, starfield].forEach(
          (obj) => {
            obj.rotation.y += deltaX * 0.01;
            obj.rotation.x += deltaY * 0.01;
          }
        );

        stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
        renderer.domElement.style.cursor = "grabbing";
        return;
      }

      handleMouseHover(e, camera, renderer);
    };

    const onMouseUp = (e: MouseEvent) => {
      console.log("Mouse up event, isDragging:", stateRef.current.isDragging);
      if (stateRef.current.isDragging) {
        const dragDistance = Math.sqrt(
          Math.pow(e.clientX - stateRef.current.mouseDownPosition.x, 2) +
            Math.pow(e.clientY - stateRef.current.mouseDownPosition.y, 2)
        );
        console.log("Drag distance:", dragDistance);

        if (dragDistance < 10) {
          console.log("Drag distance is small, treating as click");
          handleMouseClick(e, camera, renderer);
        } else {
          console.log("Drag distance too large, not treating as click");
        }
      }

      stateRef.current.isDragging = false;
      renderer.domElement.style.cursor = "default";
    };

    const onMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const delta = e.deltaY > 0 ? 1 : -1;
      camera.position.z += delta * zoomSpeed;
      camera.position.z = Math.max(2, Math.min(10, camera.position.z));
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onMouseWheel, {
      passive: false,
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (autoRotate) {
        [globe, countryFillsGroup, bordersGroup, atmosphere, starfield].forEach(
          (obj) => {
            obj.rotation.y += rotationSpeed * 0.001;
          }
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onMouseWheel);
      if (
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate, rotationSpeed]);

  // Update visual appearance when selectedCountry changes
  useEffect(() => {
    // Reset all countries to default appearance
    countryMeshesRef.current.forEach((cm) => {
      cm.mesh.material.opacity = 0.0;
      cm.mesh.material.color.setHex(cm.baseColor);
    });

    borderLinesRef.current.forEach((bl) => {
      bl.line.material.opacity = bl.baseOpacity;
      bl.line.material.color.setHex(bl.baseColor);
    });

    // Highlight selected country
    if (selectedCountry) {
      // Make country mesh white and visible
      countryMeshesRef.current.forEach((cm) => {
        if (cm.country === selectedCountry) {
          cm.mesh.material.opacity = 1.0;
          cm.mesh.material.color.setHex(0xffffff);
        }
      });

      // Make border lines white and fully opaque
      borderLinesRef.current.forEach((bl) => {
        if (bl.country === selectedCountry) {
          bl.line.material.opacity = 1.0;
          bl.line.material.color.setHex(0xffffff);
        }
      });
    }
  }, [selectedCountry]);

  const latLonToVector3 = (lat: number, lon: number, r: number) => {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  const normalizeCountryName = (name: string) => {
    if (!name) return "";
    return name.toString().toLowerCase().trim();
  };

  // Helper function to find country code from name with multiple strategies
  const findCountryCodeFromName = (countryName: string): string => {
    if (!countryName) return "";

    const normalized = normalizeCountryName(countryName);

    // Strategy 1: Direct lookup
    if (countryNameToCode[normalized]) {
      return countryNameToCode[normalized];
    }

    // Strategy 2: Check if name contains common country name patterns
    const upperName = countryName.toUpperCase();
    if (upperName.includes("USA") || upperName.includes("UNITED STATES")) {
      return "US";
    }
    if (upperName.includes("UNITED KINGDOM") || upperName.includes("UK")) {
      return "GB";
    }
    if (
      upperName.includes("SOUTH KOREA") ||
      upperName.includes("REPUBLIC OF KOREA")
    ) {
      return "KR";
    }

    // Strategy 3: Try variations
    const variations = [
      normalized,
      normalized.replace(/\s+/g, " ").trim(),
      normalized.replace(/^the\s+/i, ""),
      normalized.split(",")[0].trim(), // Take first part if comma-separated
      normalized.split(" ")[0], // First word
      normalized.split(" ").slice(0, 2).join(" "), // First two words
    ];

    for (const variation of variations) {
      if (countryNameToCode[variation]) {
        return countryNameToCode[variation];
      }
    }

    // Strategy 4: Check if the name itself is a 2-letter code
    if (normalized.length === 2 && /^[a-z]{2}$/i.test(normalized)) {
      return normalized.toUpperCase();
    }

    return "";
  };

  const getCountryColorIndex = (countryName: string) => {
    if (!countryName) return 0;
    const normalized = normalizeCountryName(countryName);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % BORDER_COLORS.length;
  };

  const createCountryShape = (coordinates: any, geometryType: string) => {
    const shapes = [];

    const processRing = (ring: any) => {
      if (ring.length < 3) return null;
      const vertices = ring.map(([lon, lat]: [number, number]) =>
        latLonToVector3(lat, lon, RADIUS * 1.001)
      );
      return vertices;
    };

    if (geometryType === "Polygon") {
      const vertices = processRing(coordinates[0]);
      if (vertices && vertices.length >= 3) shapes.push(vertices);
    } else if (geometryType === "MultiPolygon") {
      coordinates.forEach((polygon: any) => {
        const vertices = processRing(polygon[0]);
        if (vertices && vertices.length >= 3) shapes.push(vertices);
      });
    }

    return shapes;
  };

  const loadCountryBorders = async (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
      );
      const geoData = await response.json();

      const countryColorMap = new Map<string, number>();
      const drawnBorders = new Map<string, boolean>();

      const getCountryIdentifier = (feature: any) => {
        return (
          feature.properties?.ISO_A3 ||
          feature.properties?.ISO_A2 ||
          feature.properties?.NAME ||
          feature.properties?.name ||
          feature.properties?.ADMIN ||
          feature.id?.toString() ||
          ""
        );
      };

      // Collect country data
      geoData.features.forEach((feature: any) => {
        const countryId = getCountryIdentifier(feature);
        const normalized = normalizeCountryName(countryId);

        if (normalized && !countryColorMap.has(normalized)) {
          const colorIndex = getCountryColorIndex(normalized);
          countryColorMap.set(
            normalized,
            BORDER_COLORS[colorIndex % BORDER_COLORS.length]
          );

          // Try multiple ways to get country code from GeoJSON properties
          let countryCode =
            feature.properties?.ISO_A2 ||
            feature.properties?.ISO_A3 ||
            feature.properties?.iso_a2 ||
            feature.properties?.iso_a3 ||
            feature.properties?.ISO2 ||
            feature.properties?.ISO3 ||
            feature.properties?.iso2 ||
            feature.properties?.iso3 ||
            feature.properties?.ISO_A2_EH ||
            feature.properties?.ISO_A3_EH ||
            "";

          // If ISO_A3 is 3 characters, take first 2
          if (countryCode && countryCode.length === 3) {
            countryCode = countryCode.substring(0, 2);
          }
          countryCode = countryCode.toUpperCase().trim();

          // Fallback: try to get code from country name
          if (!countryCode || countryCode === "") {
            const countryName =
              feature.properties?.NAME ||
              feature.properties?.name ||
              feature.properties?.ADMIN ||
              countryId ||
              "";
            countryCode = findCountryCodeFromName(countryName);
          }

          // Log if we still don't have a code
          if (!countryCode || countryCode === "") {
            console.warn(
              "No country code found for:",
              feature.properties?.NAME || feature.properties?.name || countryId,
              "Properties:",
              Object.keys(feature.properties || {})
            );
          }

          countryDataMapRef.current.set(normalized, {
            name:
              feature.properties?.NAME || feature.properties?.name || countryId,
            code: countryCode,
            region:
              feature.properties?.REGION_UN ||
              feature.properties?.SUBREGION ||
              "Unknown",
            population: Math.floor(Math.random() * 100000000),
            gdp: Math.floor(Math.random() * 1000000000000),
          });
        }
      });

      // Create borders and fills
      geoData.features.forEach((feature: any) => {
        const geometryType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;
        const countryId = getCountryIdentifier(feature);
        const normalized = normalizeCountryName(countryId);
        const color = countryColorMap.get(normalized) || BORDER_COLORS[0];

        // Create filled mesh
        const shapes = createCountryShape(coordinates, geometryType);
        shapes.forEach((vertices: THREE.Vector3[]) => {
          if (vertices.length < 3) return;

          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(vertices.length * 3);

          vertices.forEach((v, i) => {
            positions[i * 3] = v.x;
            positions[i * 3 + 1] = v.y;
            positions[i * 3 + 2] = v.z;
          });

          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
          );

          const indices = [];
          for (let i = 1; i < vertices.length - 1; i++) {
            indices.push(0, i, i + 1);
          }
          geometry.setIndex(indices);
          geometry.computeVertexNormals();

          const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData = {
            country: normalized,
            countryName: countryDataMapRef.current.get(normalized)?.name,
            baseColor: color,
            isCountryMesh: true,
          };

          countryFillsGroupRef.current?.add(mesh);
          countryMeshesRef.current.push({
            mesh,
            country: normalized,
            baseColor: color,
          });
        });

        // Create border lines
        const processRing = (ring: any) => {
          const points = ring.map(([lon, lat]: [number, number]) =>
            latLonToVector3(lat, lon, RADIUS * 1.002)
          );

          const borderKey = `${Math.round(points[0].x * 1000)},${Math.round(
            points[0].y * 1000
          )},${Math.round(points[0].z * 1000)}-${Math.round(
            points[points.length - 1].x * 1000
          )},${Math.round(points[points.length - 1].y * 1000)},${Math.round(
            points[points.length - 1].z * 1000
          )}`;

          if (drawnBorders.has(borderKey)) return;
          drawnBorders.set(borderKey, true);

          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 1,
            transparent: true,
            opacity: 0.7,
            depthTest: false,
            depthWrite: false,
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = {
            country: normalized,
            countryName: countryDataMapRef.current.get(normalized)?.name,
          };
          bordersGroupRef.current?.add(line);

          borderLinesRef.current.push({
            line,
            originalPoints: points,
            baseColor: color,
            baseOpacity: 0.7,
            country: normalized,
          });
        };

        if (geometryType === "Polygon") {
          coordinates.forEach((ring: any) => processRing(ring));
        } else if (geometryType === "MultiPolygon") {
          coordinates.forEach((polygon: any) =>
            polygon.forEach((ring: any) => processRing(ring))
          );
        }
      });

      // Select Canada by default
      const canadaId = "canada";
      const canadaData = countryDataMapRef.current.get(canadaId) || {
        name: "Canada",
        code: "CA",
        region: "North America",
        population: 38000000,
        gdp: 2100000000000,
      };

      setSelectedCountry(canadaId);
      setCountryInfo(canadaData);

      // Fetch data from API
      if (canadaData.code) {
        fetchCountryData(canadaData.code);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading country borders:", error);
      setLoading(false);
    }
  };

  const handleMouseHover = (
    event: MouseEvent,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const fillIntersects = raycaster.intersectObjects(
      countryFillsGroupRef.current?.children || []
    );
    if (fillIntersects.length > 0) {
      const countryMesh = fillIntersects[0].object as THREE.Mesh;
      if (countryMesh.userData?.isCountryMesh) {
        const countryId = countryMesh.userData.country;
        const countryName = countryMesh.userData.countryName;

        if (hoveredCountry !== countryId) {
          setHoveredCountry(countryId);
        }

        setTooltip({
          visible: true,
          x: event.clientX + 10,
          y: event.clientY + 10,
          text: countryName || countryId,
        });
        renderer.domElement.style.cursor = "pointer";
        return;
      }
    }

    setHoveredCountry(null);
    setTooltip({ ...tooltip, visible: false });
    renderer.domElement.style.cursor = "grab";
  };

  const handleMouseClick = (
    event: MouseEvent,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    console.log("Mouse click detected");
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const fillIntersects = raycaster.intersectObjects(
      countryFillsGroupRef.current?.children || []
    );
    console.log("Fill intersects:", fillIntersects.length);

    if (fillIntersects.length > 0) {
      const countryMesh = fillIntersects[0].object as THREE.Mesh;
      console.log("Country mesh userData:", countryMesh.userData);

      if (countryMesh.userData?.isCountryMesh) {
        const countryId = countryMesh.userData.country;
        console.log("Country ID from mesh:", countryId);
        console.log(
          "Country name from mesh:",
          countryMesh.userData.countryName
        );

        const data = countryDataMapRef.current.get(countryId);
        console.log("Data from map:", data);
        console.log("Map size:", countryDataMapRef.current.size);
        console.log(
          "Map keys sample:",
          Array.from(countryDataMapRef.current.keys()).slice(0, 5)
        );

        setSelectedCountry(countryId);
        if (data) {
          setCountryInfo(data);
          // Fetch data from API
          let codeToUse = data.code;

          // If code is missing, try to get it from country name mapping
          if (!codeToUse || codeToUse.trim() === "") {
            console.log(
              "Code was missing, trying name mapping. Original name:",
              data.name
            );
            codeToUse = findCountryCodeFromName(data.name);
            console.log("Found code using name lookup:", codeToUse);
          }

          if (codeToUse && codeToUse.trim() !== "") {
            console.log("Clicking country:", data.name, "Code:", codeToUse);
            fetchCountryData(codeToUse);
          } else {
            console.warn(
              "Country code is missing or empty for:",
              data.name,
              "- Cannot fetch data"
            );
            setCountryData(null);
          }
        } else {
          console.warn("No country data found for countryId:", countryId);
          // Try to get country code from mesh userData or properties
          const countryName = countryMesh.userData.countryName;
          if (countryName) {
            console.log("Attempting to use country name:", countryName);
            const codeFromName = findCountryCodeFromName(countryName);

            if (codeFromName) {
              console.log("Found code from name mapping:", codeFromName);
              setCountryInfo({
                name: countryName,
                code: codeFromName,
                region: "Unknown",
                population: 0,
                gdp: 0,
              });
              fetchCountryData(codeFromName);
              return;
            }

            // Try to find a match in the map
            for (const [key, value] of countryDataMapRef.current.entries()) {
              if (value.name === countryName) {
                console.log("Found match:", value);
                setCountryInfo(value);
                if (value.code && value.code.trim() !== "") {
                  fetchCountryData(value.code);
                }
                return;
              }
            }
          }
        }
      } else {
        console.log("Not a country mesh");
      }
    } else {
      console.log("No fill intersects found");
    }
  };

  const fetchCountryData = async (countryCode: string) => {
    if (!countryCode || countryCode.trim() === "") {
      console.warn("fetchCountryData: No country code provided");
      setCountryData(null);
      return;
    }

    setLoadingCountryData(true);
    try {
      const url = `${API_BASE_URL}/api/countries/${countryCode}/data`;
      console.log("Fetching country data from:", url);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`No data found for country: ${countryCode}`);
          // No data available for this country
          setCountryData({ subfields: [] });
          setLoadingCountryData(false);
          return;
        }
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText);
        throw new Error(
          `Failed to fetch country data: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Received country data:", data);

      // Transform the API response to match our interface
      const transformedData: CountryResearchData = {
        subfields: data.subfields.map((sf: any) => ({
          id: sf.id,
          name: sf.name,
          works_count: sf.works_count,
          topics: sf.topics || [],
        })),
      };

      setCountryData(transformedData);
    } catch (error) {
      console.error("Error fetching country data:", error);
      setCountryData(null);
    } finally {
      setLoadingCountryData(false);
    }
  };

  const handleResetView = () => {
    if (
      globeRef.current &&
      countryFillsGroupRef.current &&
      bordersGroupRef.current &&
      atmosphereRef.current &&
      starfieldRef.current
    ) {
      globeRef.current.rotation.set(0, 0, 0);
      countryFillsGroupRef.current.rotation.set(0, 0, 0);
      bordersGroupRef.current.rotation.set(0, 0, 0);
      atmosphereRef.current.rotation.set(0, 0, 0);
      starfieldRef.current.rotation.set(0, 0, 0);
    }
  };

  const handleToggleAtmosphere = () => {
    if (atmosphereRef.current) {
      atmosphereRef.current.visible = !atmosphereRef.current.visible;
      setShowAtmosphere(!showAtmosphere);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white">Loading Globe Data...</div>
          </div>
        </div>
      )}

      <ControlPanel
        autoRotate={autoRotate}
        onAutoRotateChange={setAutoRotate}
        rotationSpeed={rotationSpeed}
        onRotationSpeedChange={setRotationSpeed}
        onResetView={handleResetView}
        onToggleAtmosphere={handleToggleAtmosphere}
        showAtmosphere={showAtmosphere}
        countryDataMap={countryDataMapRef.current}
        onCountrySelect={(country) => {
          const data = countryDataMapRef.current.get(country);
          if (data) {
            setSelectedCountry(country);
            setCountryInfo(data);
            fetchCountryData(data.code);
          }
        }}
      />

      <InfoPanel
        countryInfo={countryInfo}
        countryData={countryData}
        loading={loadingCountryData}
        onFetchTopics={async (countryCode: string, subfieldId: string) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/countries/${countryCode}/topics?subfield_id=${subfieldId}`
            );
            if (!response.ok)
              throw new Error(`Failed to fetch topics: ${response.statusText}`);
            const data = await response.json();
            return data.data.map((topic: any) => ({
              id: topic.id?.toString(),
              name: topic.name,
              works_count: topic.works_count,
            }));
          } catch (error) {
            console.error("Error fetching topics:", error);
            return [];
          }
        }}
      />
      <Tooltip {...tooltip} />
    </div>
  );
}
