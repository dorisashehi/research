import * as THREE from "three";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Create starfield
function createStarfield() {
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

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
  return stars;
}

const starfield = createStarfield();

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
document.getElementById("canvas-container").appendChild(renderer.domElement);

// Globe parameters
const radius = 2;
const segments = 64;

// Create transparent globe (ocean)
const globeGeometry = new THREE.SphereGeometry(radius, segments, segments);
const globeMaterial = new THREE.MeshBasicMaterial({
  color: 0x1a3a52,
  transparent: true,
  opacity: 0.6,
  wireframe: false,
  side: THREE.DoubleSide,
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

// Create atmosphere glow
const atmosphereGeometry = new THREE.SphereGeometry(
  radius * 1.18,
  segments,
  segments
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

// Groups
const countryFillsGroup = new THREE.Group();
scene.add(countryFillsGroup);

const bordersGroup = new THREE.Group();
scene.add(bordersGroup);

// Storage
const borderLines = [];
const countryMeshes = [];
let countryData = new Map();
let selectedCountry = null;
let hoveredCountry = null;

// Border colors
const borderColors = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0x6c5ce7, 0xa29bfe, 0xfd79a8,
  0xfdcb6e, 0xe17055, 0x00b894,
];

// State
let state = {
  autoRotate: true,
  rotationSpeed: 0.0001,
  showAtmosphere: true,
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  mouseDownPosition: { x: 0, y: 0 },
};

// Utility functions
function latLonToVector3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function normalizeCountryName(name) {
  if (!name) return "";
  return name.toString().toLowerCase().trim();
}

function getCountryColorIndex(countryName) {
  if (!countryName) return 0;
  const normalized = normalizeCountryName(countryName);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % borderColors.length;
}

function createBorderKey(points) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const key = `${Math.round(first.x * 1000)},${Math.round(
    first.y * 1000
  )},${Math.round(first.z * 1000)}-${Math.round(last.x * 1000)},${Math.round(
    last.y * 1000
  )},${Math.round(last.z * 1000)}`;
  return key;
}

// Convert coordinates to country shape
function createCountryShape(coordinates, geometryType) {
  const shapes = [];

  const processRing = (ring) => {
    if (ring.length < 3) return null;
    const vertices = ring.map(([lon, lat]) =>
      latLonToVector3(lat, lon, radius * 1.001)
    );
    return vertices;
  };

  if (geometryType === "Polygon") {
    const vertices = processRing(coordinates[0]);
    if (vertices && vertices.length >= 3) shapes.push(vertices);
  } else if (geometryType === "MultiPolygon") {
    coordinates.forEach((polygon) => {
      const vertices = processRing(polygon[0]);
      if (vertices && vertices.length >= 3) shapes.push(vertices);
    });
  }

  return shapes;
}

// Load country borders
async function loadCountryBorders() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    );
    const geoData = await response.json();

    const countryColorMap = new Map();
    const drawnBorders = new Map();

    function getCountryIdentifier(feature) {
      return (
        feature.properties?.ISO_A3 ||
        feature.properties?.ISO_A2 ||
        feature.properties?.NAME ||
        feature.properties?.name ||
        feature.properties?.ADMIN ||
        feature.id?.toString() ||
        ""
      );
    }

    // Collect country data
    geoData.features.forEach((feature) => {
      const countryId = getCountryIdentifier(feature);
      const normalized = normalizeCountryName(countryId);

      if (normalized && !countryColorMap.has(normalized)) {
        const colorIndex = getCountryColorIndex(normalized);
        countryColorMap.set(
          normalized,
          borderColors[colorIndex % borderColors.length]
        );

        let countryCode =
          feature.properties?.ISO_A2 || feature.properties?.ISO_A3 || "";
        if (countryCode && countryCode.length === 3) {
          countryCode = countryCode.substring(0, 2);
        }
        countryCode = countryCode.toUpperCase();

        countryData.set(normalized, {
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

    // Create filled meshes and borders
    geoData.features.forEach((feature) => {
      const geometryType = feature.geometry.type;
      const coordinates = feature.geometry.coordinates;
      const countryId = getCountryIdentifier(feature);
      const normalized = normalizeCountryName(countryId);
      const color = countryColorMap.get(normalized) || borderColors[0];

      // Create filled polygon meshes
      const shapes = createCountryShape(coordinates, geometryType);
      shapes.forEach((vertices) => {
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
          countryName: countryData.get(normalized)?.name,
          baseColor: color,
          isCountryMesh: true,
        };

        countryFillsGroup.add(mesh);
        countryMeshes.push({ mesh, country: normalized, baseColor: color });
      });

      // Create border lines
      const processRing = (ring) => {
        const points = ring.map(([lon, lat]) =>
          latLonToVector3(lat, lon, radius * 1.002)
        );

        const borderKey = createBorderKey(points);
        const reverseKey = createBorderKey([...points].reverse());

        if (
          borderKey &&
          (drawnBorders.has(borderKey) || drawnBorders.has(reverseKey))
        )
          return;
        if (borderKey) drawnBorders.set(borderKey, true);

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
          countryName: countryData.get(normalized)?.name,
        };
        bordersGroup.add(line);

        borderLines.push({
          line,
          originalPoints: points,
          baseColor: color,
          baseOpacity: 0.7,
          country: normalized,
        });
      };

      if (geometryType === "Polygon") {
        coordinates.forEach((ring) => processRing(ring));
      } else if (geometryType === "MultiPolygon") {
        coordinates.forEach((polygon) =>
          polygon.forEach((ring) => processRing(ring))
        );
      }
    });

    // Select US by default
    let usCountryId = null;
    // Try to find US by code "US" or by name containing "United States"
    for (const [countryId, data] of countryData.entries()) {
      if (data.code === "US" || data.name.toLowerCase().includes("united states")) {
        usCountryId = countryId;
        break;
      }
    }

    // If not found by code, try common identifiers
    if (!usCountryId) {
      const possibleIds = ["us", "usa", "united states"];
      for (const id of possibleIds) {
        if (countryData.has(id)) {
          usCountryId = id;
          break;
        }
      }
    }

    if (usCountryId) {
      selectCountry(usCountryId);
      const usData = countryData.get(usCountryId);
      if (usData) {
        // Update search input with selected country name
        const searchInput = document.getElementById("country-search");
        if (searchInput) {
          searchInput.value = usData.name;
        }

        // Fetch and display US data
        const countryCode = usData.code || "US";
        fetchCountryData(countryCode).then((countryResearchData) => {
          if (
            countryResearchData &&
            countryResearchData.subfields &&
            countryResearchData.subfields.length > 0
          ) {
            showCountryInfo(usData, countryResearchData);
          } else {
            showCountryInfo(usData, null);
          }
        });
      }
    }

    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading country borders:", error);
    document.getElementById("loading").innerHTML =
      '<div class="spinner"></div><div>Error loading data. Please refresh.</div>';
  }
}

// Mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
const infoPanel = document.getElementById("info-panel");

function onMouseDown(event) {
  state.isDragging = true;
  state.previousMousePosition = { x: event.clientX, y: event.clientY };
  state.mouseDownPosition = { x: event.clientX, y: event.clientY };
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (state.isDragging) {
    const deltaX = event.clientX - state.previousMousePosition.x;
    const deltaY = event.clientY - state.previousMousePosition.y;

    [globe, countryFillsGroup, bordersGroup, atmosphere, starfield].forEach(
      (obj) => {
        obj.rotation.y += deltaX * 0.01;
        obj.rotation.x += deltaY * 0.01;
      }
    );

    state.previousMousePosition = { x: event.clientX, y: event.clientY };
    renderer.domElement.style.cursor = "grabbing";
    return;
  }

  // Raycast for hover
  raycaster.setFromCamera(mouse, camera);

  // Check countries
  const fillIntersects = raycaster.intersectObjects(countryFillsGroup.children);
  if (fillIntersects.length > 0) {
    const countryMesh = fillIntersects[0].object;
    if (countryMesh.userData.isCountryMesh) {
      const countryId = countryMesh.userData.country;
      const countryName = countryMesh.userData.countryName;

      if (hoveredCountry !== countryId) {
        if (hoveredCountry) unhighlightCountry(hoveredCountry);
        hoveredCountry = countryId;
        highlightCountryHover(countryId);
      }

      tooltip.textContent = countryName || countryId;
      tooltip.style.display = "block";
      tooltip.style.left = event.clientX + 10 + "px";
      tooltip.style.top = event.clientY + 10 + "px";
      renderer.domElement.style.cursor = "pointer";
      return;
    }
  }

  // Over ocean
  if (hoveredCountry) {
    unhighlightCountry(hoveredCountry);
    hoveredCountry = null;
  }

  const globeIntersects = raycaster.intersectObject(globe);
  if (globeIntersects.length > 0) {
    renderer.domElement.style.cursor = "grab";
  } else {
    renderer.domElement.style.cursor = "default";
  }
  tooltip.style.display = "none";
}

function onMouseUp(event) {
  if (state.isDragging) {
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - state.mouseDownPosition.x, 2) +
        Math.pow(event.clientY - state.mouseDownPosition.y, 2)
    );

    if (dragDistance < 5) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Check countries
      const fillIntersects = raycaster.intersectObjects(
        countryFillsGroup.children
      );
      if (fillIntersects.length > 0) {
        const countryMesh = fillIntersects[0].object;
        if (countryMesh.userData.isCountryMesh) {
          const countryId = countryMesh.userData.country;
          selectCountry(countryId);
          const data = countryData.get(countryId);
          // Update search input with selected country name
          const searchInput = document.getElementById("country-search");
          if (searchInput && data) {
            searchInput.value = data.name;
          }
          if (data) {
            let countryCode = data.code || "";
            if (!countryCode || countryCode.length < 2) {
              countryCode = countryId.toUpperCase().slice(0, 2);
            } else if (countryCode.length > 2) {
              countryCode = countryCode.substring(0, 2);
            }
            countryCode = countryCode.toUpperCase();

            console.log(
              `Fetching data for country: ${data.name} (${countryCode})`
            );
            fetchCountryData(countryCode).then((countryResearchData) => {
              console.log(
                `Received data for ${countryCode}:`,
                countryResearchData
              );
              if (
                countryResearchData &&
                countryResearchData.subfields &&
                countryResearchData.subfields.length > 0
              ) {
                showCountryInfo(data, countryResearchData);
              } else {
                showCountryInfo(data, null);
                console.log(
                  `No subfields data found for country code: ${countryCode}`,
                  countryResearchData
                );
              }
            });
          }
        }
      }
    }
  }

  state.isDragging = false;
  renderer.domElement.style.cursor = "default";
}

// Mouse wheel zoom
function onMouseWheel(event) {
  event.preventDefault();

  const zoomSpeed = 0.1;
  const delta = event.deltaY > 0 ? 1 : -1;

  camera.position.z += delta * zoomSpeed;
  camera.position.z = Math.max(2, Math.min(10, camera.position.z));
}

async function fetchCountryData(countryCode) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/countries/${countryCode}/data`
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `API error for ${countryCode}: ${response.status} ${response.statusText}`,
        errorData
      );
      return null;
    }
    const data = await response.json();
    if (data.error) {
      console.error(`API returned error for ${countryCode}:`, data.error);
      return null;
    }
    console.log(`Successfully fetched data for ${countryCode}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching country data for ${countryCode}:`, error);
    return null;
  }
}

function showCountryInfo(data, countryData) {
  document.getElementById("country-name").textContent = data.name;

  const infoContent = document.getElementById("info-content");
  if (!infoContent) {
    const contentDiv = document.createElement("div");
    contentDiv.id = "info-content";
    document.getElementById("info-panel").appendChild(contentDiv);
  }

  if (
    countryData &&
    countryData.subfields &&
    countryData.subfields.length > 0
  ) {
    let html = `<div class="section-header">Top ${countryData.subfields.length} Research Subfields</div>`;

    countryData.subfields.forEach((subfield, idx) => {
      const hasTopics = subfield.topics && subfield.topics.length > 0;
      html += `
        <div class="subfield-card ${
          hasTopics ? "" : "expanded"
        }" data-index="${idx}">
          <div class="subfield-header" onclick="toggleSubfield(${idx})">
            <div class="subfield-title">
              <span class="subfield-rank">${idx + 1}</span>
              <div>
                <div class="subfield-name">${subfield.name}</div>
                <div class="subfield-works">${subfield.works_count.toLocaleString()} works</div>
              </div>
            </div>
            ${hasTopics ? '<span class="subfield-toggle">▶</span>' : ""}
          </div>
      `;

      if (hasTopics) {
        html += `<div class="subfield-topics">
          <ul class="topics-list">`;

        subfield.topics.slice(0, 5).forEach((topic) => {
          html += `
            <li class="topic-item">
              <span class="topic-name">${topic.name}</span>
              <span class="topic-count">${topic.works_count.toLocaleString()} works</span>
            </li>`;
        });

        html += `</ul></div>`;
      }

      html += `</div>`;
    });

    document.getElementById("info-content").innerHTML = html;
  } else {
    document.getElementById(
      "info-content"
    ).innerHTML = `<div class="no-data-message">
        <div style="font-size: 32px; margin-bottom: 10px;">📭</div>
        <div>No research data available for this country.</div>
      </div>`;
  }

  infoPanel.classList.add("visible");
}

function toggleSubfield(index) {
  const cards = document.querySelectorAll(".subfield-card");
  const card = cards[index];
  if (card) {
    card.classList.toggle("expanded");
  }
}

window.toggleSubfield = toggleSubfield;

function highlightCountryHover(countryId) {
  // Only highlight borders on hover, keep mesh invisible
  borderLines.forEach((bl) => {
    if (bl.country === countryId) bl.line.material.opacity = 1.0;
  });
}

function unhighlightCountry(countryId) {
  if (selectedCountry === countryId) return;

  countryMeshes.forEach((cm) => {
    if (cm.country === countryId) cm.mesh.material.opacity = 0.0;
  });
  borderLines.forEach((bl) => {
    if (bl.country === countryId) bl.line.material.opacity = bl.baseOpacity;
  });
}

function selectCountry(countryId) {
  // Reset previous selection
  if (selectedCountry) {
    countryMeshes.forEach((cm) => {
      if (cm.country === selectedCountry) cm.mesh.material.opacity = 0.0;
    });
    borderLines.forEach((bl) => {
      if (bl.country === selectedCountry) {
        bl.line.material.opacity = bl.baseOpacity;
        bl.line.material.color.setHex(bl.baseColor);
      }
    });
  }

  // Highlight selected country - only borders, no fill
  // Keep mesh invisible to avoid showing triangulation edges
  countryMeshes.forEach((cm) => {
    if (cm.country === countryId) {
      cm.mesh.material.opacity = 0.0; // Keep invisible
    }
  });

  // Highlight borders in white with full opacity
  borderLines.forEach((bl) => {
    if (bl.country === countryId) {
      bl.line.material.opacity = 1.0;
      bl.line.material.color.setHex(0xffffff);
    }
  });

  selectedCountry = countryId;
}

// Search
function setupSearch() {
  const searchInput = document.getElementById("country-search");
  const searchResults = document.getElementById("search-results");
  let currentMatches = [];

  // Function to select a country by ID
  function selectCountryFromSearch(countryId) {
    selectCountry(countryId);
    const data = countryData.get(countryId);
    if (data) {
      let countryCode = data.code || "";
      if (!countryCode || countryCode.length < 2) {
        countryCode = countryId.toUpperCase().slice(0, 2);
      } else if (countryCode.length > 2) {
        countryCode = countryCode.substring(0, 2);
      }
      countryCode = countryCode.toUpperCase();

      console.log(
        `Fetching data for country: ${data.name} (${countryCode})`
      );
      fetchCountryData(countryCode).then((countryResearchData) => {
        console.log(
          `Received data for ${countryCode}:`,
          countryResearchData
        );
        if (
          countryResearchData &&
          countryResearchData.subfields &&
          countryResearchData.subfields.length > 0
        ) {
          showCountryInfo(data, countryResearchData);
        } else {
          showCountryInfo(data, null);
          console.log(
            `No subfields data found for country code: ${countryCode}`,
            countryResearchData
          );
        }
      });
    }
    searchResults.style.display = "none";
    searchInput.value = data.name;
  }

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query.length < 1) {
      searchResults.style.display = "none";
      currentMatches = [];
      return;
    }

    currentMatches = Array.from(countryData.entries())
      .filter(
        ([key, data]) =>
          data.name.toLowerCase().includes(query) ||
          data.code.toLowerCase().includes(query)
      )
      .slice(0, 10);

    if (currentMatches.length === 0) {
      searchResults.style.display = "none";
      return;
    }

    searchResults.innerHTML = currentMatches
      .map(
        ([key, data]) =>
          `<div class="search-result-item" data-country="${key}">${data.name}</div>`
      )
      .join("");
    searchResults.style.display = "block";

    searchResults.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const countryId = item.dataset.country;
        selectCountryFromSearch(countryId);
      });
    });
  });

  // Handle Enter key press
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentMatches.length > 0) {
        // Select the first matching country
        const [countryId] = currentMatches[0];
        selectCountryFromSearch(countryId);
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}

// ============ API CONFIGURATION ============

const API_BASE_URL = "http://localhost:5000/api";

// ============ END API CONFIGURATION ============

// Controls
function setupControls() {
  const speedSlider = document.getElementById("rotation-speed");
  const speedValue = document.getElementById("speed-value");
  speedSlider.addEventListener("input", (e) => {
    const speed = parseFloat(e.target.value);
    state.rotationSpeed = speed * 0.001;
    speedValue.textContent = speed.toFixed(1) + "x";
  });

  document.getElementById("toggle-rotation").addEventListener("click", (e) => {
    state.autoRotate = !state.autoRotate;
    e.target.classList.toggle("active");
  });

  document.getElementById("reset-view").addEventListener("click", () => {
    [globe, countryFillsGroup, bordersGroup, atmosphere, starfield].forEach(
      (obj) => {
        obj.rotation.set(0, 0, 0);
      }
    );
    camera.position.z = 4;
  });

  document
    .getElementById("toggle-atmosphere")
    .addEventListener("click", (e) => {
      state.showAtmosphere = !state.showAtmosphere;
      atmosphere.visible = state.showAtmosphere;
      e.target.classList.toggle("active");
    });

  // Set atmosphere button as active by default
  document.getElementById("toggle-atmosphere").classList.add("active");

  document.getElementById("close-info").addEventListener("click", () => {
    infoPanel.classList.remove("visible");
  });
}

// Event listeners
renderer.domElement.addEventListener("mousedown", onMouseDown);
renderer.domElement.addEventListener("mousemove", onMouseMove);
renderer.domElement.addEventListener("mouseup", onMouseUp);
renderer.domElement.addEventListener("mouseleave", onMouseUp);
renderer.domElement.addEventListener("wheel", onMouseWheel, { passive: false });

// Border opacity update
function updateBorderOpacity() {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.multiplyScalar(-1);

  borderLines.forEach((borderLine) => {
    const positions = borderLine.line.geometry.attributes.position;
    if (!positions || positions.count === 0) return;

    let midpoint = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3();
      point.fromBufferAttribute(positions, i);
      borderLine.line.localToWorld(point);
      midpoint.add(point);
    }
    midpoint.divideScalar(positions.count);

    const directionToMidpoint = midpoint.clone().normalize();
    const dotProduct = directionToMidpoint.dot(cameraDirection);

    const dimOpacity = 0.2;
    const opacityRange = borderLine.baseOpacity - dimOpacity;
    const newOpacity = dimOpacity + ((dotProduct + 1) / 2) * opacityRange;

    borderLine.line.material.opacity = Math.max(
      dimOpacity,
      Math.min(borderLine.baseOpacity, newOpacity)
    );
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Auto-rotate
  if (state.autoRotate && !state.isDragging) {
    [globe, countryFillsGroup, bordersGroup, atmosphere, starfield].forEach(
      (obj) => {
        obj.rotation.y += state.rotationSpeed;
      }
    );
  }

  updateBorderOpacity();
  renderer.render(scene, camera);
}

// Window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Initialize
loadCountryBorders();
setupControls();
setupSearch();
animate();
