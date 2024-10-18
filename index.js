import * as THREE from './build/three.module.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { STLLoader } from './examples/jsm/loaders/STLLoader.js';
import { STLExporter } from './examples/jsm/exporters/STLExporter.js';

let letter_meshes = new Map()

let letter_widths = {
    'A':10.3615, 'B':9.3179, 'C':10.4161, 'D':10.0341, 'E':9.236,
    'F':8.41064, 'G':11.14598, 'H':9.99318, 'I':3.60164, 'J':7.63302,
    'K':9.31787, 'L':7.76944, 'M':11.62347, 'N':10.04775, 'O':11.21419,
    'P':9.2633, 'Q':11.28922, 'R':10.01364, 'S':9.71351, 'T':9.22919,
    'U':10.01364, 'V':10.27967, 'W':14.0382, 'X':10.27967, 'Y':10.30014,
    'Z':9.27694
}

// ----- CREATE GUI -----
let message1 = "HELLO",
    message2 = "WORLD",
    color = "#000000",
    spacing = 0

// create color palette
const palette = {
    Color: '#000000',
}

// add buttons and parameters to GUI
const gui = new dat.GUI();

const params = {
    "Message 1": "HELLO",
    "Message 2": "WORLD",
    "Front View": ()=>{
        interpolateToTarget(new THREE.Vector3(0, 0, 200));
    },
    "Right View": ()=>{interpolateToTarget(new THREE.Vector3(200, 0, 0))},
    "Spacing" : spacing,
    // "Add Base": true,
    "Export": downloadFile
};
gui.add(params, 'Message 1').onChange(
    function(value){
        message1 = value.toUpperCase().replace(/[^A-Z]/gi, ''); // make everything uppercase and weed out non-alphabetic chars
        refreshText();
    }
)
gui.add(params, 'Message 2').onChange((value)=>{
    message2 = value.toUpperCase().replace(/[^A-Z]/gi, ''); // make everything uppercase and weed out non-alphabetic chars
    refreshText();
});
gui.add(params, "Front View");
gui.add(params, "Right View");

gui.addColor(palette, 'Color').onChange((value)=>{
    color = value;
    refreshText();
});

gui.add(params, 'Spacing', 0, 20).step(0.01).onChange((value)=>{
    spacing = value;
    refreshText();
});

// gui.add(params, 'Add Base');

gui.add(params, 'Export');

document.addEventListener("keydown", (e)=>{
    if (document.activeElement.tagName === "INPUT"){
        return; // don't turn the page when user is typing in a message
    }
    if (e.key === "ArrowLeft"){
        interpolateToTarget(new THREE.Vector3(0, 0, 200));
    } else if (e.key ==="ArrowRight"){
        interpolateToTarget(new THREE.Vector3(200, 0, 0));
    }
})

// here lies the brains of the operation when it comes to intelligently splitting up words
function developGrid(word1, word2) {
    let word1_is_longer = word1.length >= word2.length;
    let shorter_word = "";
    let longer_word = "";
    if (word1_is_longer) {
        longer_word = word1;
        shorter_word = word2;
    }
    else {
        longer_word = word2;
        shorter_word = word1;
    }

    // These weights determine which letter we prefer to split in half (when splitting in half is necessary)
    // e.g. we would very much like to split W in half, but we don't want to split J in half at all
    let letter_priority = {
        "A":14, "B":16, "C":25, "D":10, "E":11,
        "F":18, "G":24, "H":4, "I":19, "J":26,
        "K":6, "L":20, "M":7, "N":12, "O":13,
        "P":21, "Q":9, "R":8, "S":22, "T":17,
        "U":2, "V":3, "W":1, "X":5, "Y":15,
        "Z":23
    }

    // ----- DETERMINE SHORTER MESSAGE SPLITTING -----
    let shorter_word_nums = [];
    let longer_word_nums = [];

    for (let i=0; i<longer_word.length; i++) {
        longer_word_nums[i] = 1;
    }

    for (let i=0; i<shorter_word.length; i++) {
        shorter_word_nums[i] = 1;
    }

    let shorter_word_num_total = shorter_word.length

    while (shorter_word_num_total < longer_word.length) {
        let best_letter = 0;
        let lowest_priority = 100;
        let lowest_num = 100;

        for (let i=0; i<shorter_word.length; i++) {
            if (shorter_word_nums[i] < lowest_num) {
                best_letter = i;
                lowest_priority = letter_priority[shorter_word.charAt(i)];
                lowest_num = shorter_word_nums[i];
            }
            else if (
                shorter_word_nums[i] === lowest_num &&
                letter_priority[shorter_word.charAt(i)] <= lowest_priority
            ){
                best_letter = i;
                lowest_priority = letter_priority[shorter_word.charAt(i)];
                lowest_num = shorter_word_nums[i];
            }
        }
        shorter_word_nums[best_letter] = shorter_word_nums[best_letter] + 1;
        shorter_word_num_total = shorter_word_num_total + 1;
    }

    let longer_word_array = [];
    let shorter_word_array = [];
    let shorter_word_letter_complete = [];
    let longer_word_new_letter = [];

    for (let i=0; i<longer_word.length; i=i+1 ) {
        longer_word_array.push(longer_word.charAt(i));
        longer_word_new_letter[i] = true;
    }

    for (let i=0; i<shorter_word.length; i=i+1 ) {
        if (shorter_word_nums[i] === 1) {
            shorter_word_array.push(shorter_word.charAt(i));
            shorter_word_letter_complete.push(true);
        }
        else {
            for (let j=0; j<shorter_word_nums[i]; j=j+1) {
                shorter_word_letter_complete.push(j===shorter_word_nums[i]-1);
                if (j < Math.floor(shorter_word_nums[i]/2)) {
                    shorter_word_array.push(shorter_word.charAt(i)+"l");
                }
                else {
                    shorter_word_array.push(shorter_word.charAt(i)+"r");
                }
            }
        }
    }

    if (word1_is_longer) {
        // console.log(longer_word_array, shorter_word_array)
        return [longer_word_array, shorter_word_array, longer_word_new_letter, shorter_word_letter_complete];
    }
    else {
        // console.log(shorter_word_array, longer_word_array)
        return [shorter_word_array, longer_word_array, shorter_word_letter_complete, longer_word_new_letter];
    }
}

function setObjectVisibility(obj, visibility) {
    obj.traverse ( function (child) {
        if (child instanceof THREE.Mesh) {
            child.visible = visibility;
        }
    });
}

function refreshText() {
    // clearThree(group);
    scene.remove(group);
    group = new THREE.Group();

    // get grid data
    const grid_data = developGrid(message1, message2)
    const message1Letters = grid_data[0];
    const message2Letters = grid_data[1];
    const doesLetteriOfMessage1Move = grid_data[2];
    const doesLetteriOfMessage2Move = grid_data[3];

    if (message1.length === 0 || message2.length === 0) {
        requestRenderIfNotRequested()
    }

    // load stls according to grid data
    let currentPosition = [0,0]

    let intersections_dir = './examples/jsm/models/stl/binary/';

    for (let i = 0; i<message1Letters.length; i++) {
        let objectFileName = intersections_dir + message1Letters[i] + "_" + message2Letters[i] + ".stl";
        let dx = currentPosition[0]; let dz = currentPosition[1];
        if (i>0) {
            let moveX = doesLetteriOfMessage1Move[i-1];
            let moveZ = doesLetteriOfMessage2Move[i-1];
            if (moveX) {
                dx += 3*letter_widths[message1Letters[i-1].charAt(0)] + spacing
            }
            if (moveZ) {
                dz -= 3*letter_widths[message2Letters[i-1].charAt(0)] + spacing
            }
        }
        currentPosition[0] = dx;
        currentPosition[1] = dz;

        if (letter_meshes.has(message1Letters[i] + "_" + message2Letters[i])) {
            processMesh(letter_meshes.get(message1Letters[i] + "_" + message2Letters[i]).clone(), dx, dz)
        }
        else {
            try {
                loader.load( objectFileName , function ( geometry ) {
                    letter_meshes.set(`${message1Letters[i]}_${message2Letters[i]}`, geometry.clone());
                    processMesh(geometry, dx, dz);
                    // console.log(`creating instance of ${message1Letters[i]}_${message2Letters[i]}.stl at location (${dx},${dz})`);
                } );
            } catch(err){
                // console.log(`Tried to get nonexistent mesh ${message1Letters[i]}_${message2Letters[i]}`);
            }
        }
    }

    // center the text
    // const boundingBox = new THREE.Box3().setFromObject(group);
    // const center = new THREE.Vector3();
    // boundingBox.getCenter(center);
    // group.children.forEach((child)=>{
    //     child.position.addScaledVector(center,-1);
    // });
    // render();
    new THREE.Box3().setFromObject( group ).getCenter( group.position ).multiplyScalar( - 1 );
    scene.add(group);
}


function processMesh(geometry, dx, dz) {
    const material = new THREE.MeshPhongMaterial( {color: color, specular: 0x000000, shininess: 0} );
    let mesh = new THREE.Mesh( geometry, material );
    mesh.position.set( dx, 0, dz);
    mesh.rotation.set( -Math.PI / 2, 0, 0);
    mesh.scale.set( 3, 3, 3 );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    requestRenderIfNotRequested();
}
// ----- NEW WORDLD BELOW -----

let scene, scene_trash, camera, renderer, exporter, loader, mesh, group, controls, clock, currentAnimId;

function init() {

    // const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
    camera = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        1,
        1000
    );
    camera.position.set( 0, 0, 200 ); // text mesh has height of 30 always
    camera.zoom = 3.6;
    camera.updateProjectionMatrix();
    window.camera = camera

    scene = new THREE.Scene();
    scene_trash = [];
    scene.background = new THREE.Color( 0xa0a0a0 );
    scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );

    clock = new THREE.Clock();

    loader = new STLLoader();

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 200, 0 );
    scene.add( hemiLight );

    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 0, 200, 100 );
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 180;
    directionalLight.shadow.camera.bottom = - 100;
    directionalLight.shadow.camera.left = - 120;
    directionalLight.shadow.camera.right = 120;
    scene.add(directionalLight);

    group = new THREE.Group();

    scene.add(group);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    //
    controls = new OrbitControls( camera, renderer.domElement );
    window.controls = controls; // todo: delet
    controls.target.set( 0, 0, 0 );
    controls.update();
    controls.addEventListener('change', ()=>{
        currentAnimId = 0; // cancels current animation if one's playing
        requestRenderIfNotRequested();
    });

    refreshText();
    render();

    window.addEventListener( 'resize', onWindowResize);
    // animate()
}

function downloadFile() {
    let exporter = new STLExporter();
    let str = exporter.parse( group ); // Export the scene
    let blob = new Blob( [str], { type : 'text/plain' } ); // Generate Blob from the string
    //saveAs( blob, 'file.stl' ); //Save the Blob to file.stl

    //Following code will help you to save the file without FileSaver.js
    let link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = 'illusion.stl';
    link.click();
}

function interpolateToTarget(endPosition) {
    controls.target.set( 0, 0, 0 );
    let animationDone = false;
    currentAnimId = Date.now();
    clock.start();
    const id = currentAnimId;
    function animate() {
        if (animationDone || id !== currentAnimId) {
            // Stop further animation if it's done
            return;
        }
        requestAnimationFrame(animate);

        // Get the elapsed time since the animation started
        const elapsedTime = clock.getElapsedTime();

        // Total time for the animation (e.g. 2 seconds)
        const duration = 2; // Adjust this value to control animation speed

        // Interpolate position using lerp
        const t = Math.min(elapsedTime / duration, 1); // Ensure t is in the 0-1 range

        // Starting position is whatever the camera is rn
        const startPosition = new THREE.Vector3()
        startPosition.copy(camera.position);

        // Lerp the camera position between start and end
        const currentPosition = new THREE.Vector3().lerpVectors(startPosition, endPosition, t);

        // Update the camera's position
        camera.position.copy(currentPosition);

        // Ensure the camera always looks at the origin
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        // Render the scene
        renderer.render(scene, camera);

        // When the animation reaches the target position (t === 1), stop the loop
        if (t === 1) {
            animationDone = true; // Set the flag to true to stop further animation
        }
    }
    animate();
}



function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    requestRenderIfNotRequested()
}

let renderRequested = false;

function render() {
    renderRequested = undefined;
    controls.update();
    renderer.render(scene, camera);
}


function requestRenderIfNotRequested() {
    if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(render);
    }
}

document.addEventListener("DOMContentLoaded", ()=>{
    init();
    setTimeout(refreshText, 15);
});

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

console.log("Programmed by:\nOmri Shavit\nAlexandru Munteanu");
