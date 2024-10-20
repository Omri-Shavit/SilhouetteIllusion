import * as THREE from './build/three.module.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { STLLoader } from './examples/jsm/loaders/STLLoader.js';
import { STLExporter } from './examples/jsm/exporters/STLExporter.js';

const camerasDistanceToOrigin = 200;

let letter_meshes = new Map();

let letter_widths = {
    'A':10.3615, 'B':9.3179, 'C':10.4161, 'D':10.0341, 'E':9.236,
    'F':8.41064, 'G':11.14598, 'H':9.99318, 'I':3.60164, 'J':7.63302,
    'K':9.31787, 'L':7.76944, 'M':11.62347, 'N':10.04775, 'O':11.21419,
    'P':9.2633, 'Q':11.28922, 'R':10.01364, 'S':9.71351, 'T':9.22919,
    'U':10.01364, 'V':10.27967, 'W':14.0382, 'X':10.27967, 'Y':10.30014,
    'Z':9.27694, ' ': 6.6985
};

// ----- CREATE GUI -----
const url = new URL(window.location.href);
const urlParams = new URLSearchParams(url.search);

// initialize params
let message1 = urlParams.get("message1") || "HELLO",
    message2 = urlParams.get("message2") || "WORLD",
    isCycling = Boolean(urlParams.get("isCycling")) || false,
    color = urlParams.get("color") || "#000000",
    spacing = Number(urlParams.get("spacing")) || 0;

// create color palette
const palette = {
    Color: '#000000',
};

// add buttons and parameters to GUI
const gui = new dat.GUI();

const params = {
    "Message 1": "HELLO",
    "Message 2": "WORLD",
    "Front View": ()=>{
        interpolateCameraToTarget(new THREE.Vector3(0, 0, camerasDistanceToOrigin));
    },
    "Right View": ()=>{interpolateCameraToTarget(new THREE.Vector3(camerasDistanceToOrigin, 0, 0))},
    "Cycle Animation": isCycling,
    "Spacing" : spacing,
    // "Add Base": true,
    "Export": downloadFile
};

// add buttons to dat GUI
gui.add(params, 'Message 1').onChange((value)=>{
    message1 = value.toUpperCase().replace(/[^A-Z ]/g, ''); // make everything uppercase and weed out non-alphabetic chars
    refreshText();
    urlParams.set("message1", message1);
    url.search = urlParams.toString();
    window.history.pushState({}, '', url);
});

gui.add(params, 'Message 2').onChange((value)=>{
    message2 = value.toUpperCase().replace(/[^A-Z ]/g, ''); // make everything uppercase and weed out non-alphabetic chars
    refreshText();
    urlParams.set("message2", message2);
    url.search = urlParams.toString();
    window.history.pushState({}, '', url);
});
gui.add(params, "Front View");
gui.add(params, "Right View");

const toggleCycleSwitch = gui.add(params, "Cycle Animation").onChange((value)=>{
    isCycling = value;
    if (isCycling){
        cycleBetweenViews(); // start the cycling
        urlParams.set("isCycling", String(isCycling));
    } else {
        currentAnimId = 0; // stop the cycling
        urlParams.delete("isCycling");
    }
    url.search = urlParams.toString();
    window.history.pushState({}, '', url);
});

gui.addColor(palette, 'Color').onChange((value)=>{
    color = value;
    if (color !== '#000000'){
        urlParams.set("color", color);
    } else {
        urlParams.delete("color");
    }
    url.search = urlParams.toString();
    window.history.pushState({}, '', url);
    refreshText();
});

gui.add(params, 'Spacing', 0, 20).step(0.01).onChange((value)=>{
    spacing = value;
    if (spacing !== 0){
        urlParams.set("spacing", spacing);
    } else {
        urlParams.delete("spacing");
    }
    url.search = urlParams.toString();
    window.history.pushState({}, '', url);
    refreshText();
});

// gui.add(params, 'Add Base');

gui.add(params, 'Export');
if (urlParams.has("message1") || urlParams.has("message2")){
    gui.close();
}

// handle keystrokes e.g. left and right arrows trigger view left and view right respectively
document.addEventListener("keydown", (e)=>{
    if (document.activeElement.tagName === "INPUT"){
        return; // don't turn the page when user is typing in a message
    }
    if (e.key === "ArrowLeft"){
        interpolateCameraToTarget(new THREE.Vector3(0, 0, camerasDistanceToOrigin));
    } else if (e.key ==="ArrowRight"){
        interpolateCameraToTarget(new THREE.Vector3(camerasDistanceToOrigin, 0, 0));
    }
})

// Here lies the brains of the operation when it comes to intelligently splitting up words
function determineM1M2LetterMapping(firstMessage, secondMessage) {
    // get rid of spaces in input messages (we handle those elsewhere)
    firstMessage = firstMessage.replaceAll(' ','');
    secondMessage = secondMessage.replaceAll(' ','');
    let firstMessageIsLonger = firstMessage.length >= secondMessage.length;
    let shorterMessage;
    let longerMessage;
    if (firstMessageIsLonger) {
        longerMessage = firstMessage;
        shorterMessage = secondMessage;
    }
    else {
        longerMessage = secondMessage;
        shorterMessage = firstMessage;
    }

    // These weights determine which letter we prefer to split in half (when splitting in half is necessary)
    // e.g. we would very much like to split W in half, but we don't want to split J in half at all
    let letterPriority = {
        "A":14, "B":16, "C":25, "D":10, "E":11,
        "F":18, "G":24, "H":4, "I":19, "J":26,
        "K":6, "L":20, "M":7, "N":12, "O":13,
        "P":21, "Q":9, "R":8, "S":22, "T":17,
        "U":2, "V":3, "W":1, "X":5, "Y":15,
        "Z":23
    }

    // ----- DETERMINE HOW TO SPLIT UP THE CHARACTERS OF THE SHORTER MESSAGE -----
    let shorter_word_nums = [];

    for (let i=0; i<shorterMessage.length; i++) {
        shorter_word_nums[i] = 1;
    }

    let shorter_word_num_total = shorterMessage.length

    while (shorter_word_num_total < longerMessage.length) {
        let best_letter = 0;
        let lowest_priority = 100;
        let lowest_num = 100;

        for (let i=0; i<shorterMessage.length; i++) {
            if (shorter_word_nums[i] < lowest_num) {
                best_letter = i;
                lowest_priority = letterPriority[shorterMessage.charAt(i)];
                lowest_num = shorter_word_nums[i];
            }
            else if (
                shorter_word_nums[i] === lowest_num &&
                letterPriority[shorterMessage.charAt(i)] <= lowest_priority
            ){
                best_letter = i;
                lowest_priority = letterPriority[shorterMessage.charAt(i)];
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

    for (let i=0; i<longerMessage.length; i++ ) {
        longer_word_array.push(longerMessage.charAt(i));
        longer_word_new_letter[i] = true;
    }

    for (let i=0; i<shorterMessage.length; i++ ) {
        if (shorter_word_nums[i] === 1) {
            shorter_word_array.push(shorterMessage.charAt(i));
            shorter_word_letter_complete.push(true);
        }
        else {
            for (let j=0; j<shorter_word_nums[i]; j=j+1) {
                shorter_word_letter_complete.push(j===shorter_word_nums[i]-1);
                if (j < Math.floor(shorter_word_nums[i]/2)) {
                    shorter_word_array.push(shorterMessage.charAt(i)+"l");
                }
                else {
                    shorter_word_array.push(shorterMessage.charAt(i)+"r");
                }
            }
        }
    }

    if (firstMessageIsLonger) {
        return [longer_word_array, shorter_word_array, longer_word_new_letter, shorter_word_letter_complete];
    }
    else {
        return [shorter_word_array, longer_word_array, shorter_word_letter_complete, longer_word_new_letter];
    }
}

function refreshText() {
    // clearThree(group);
    scene.remove(group);
    group = new THREE.Group();

    // Count the number of spaces preceding a specific character
    const numberOfSpacesPrecedingLetterIInMessage1 = [0];
    for(let i = 0; i<message1.length; i++){
        if (message1.charAt(i) === ' '){
            numberOfSpacesPrecedingLetterIInMessage1[numberOfSpacesPrecedingLetterIInMessage1.length-1] += 1;
        } else {
            numberOfSpacesPrecedingLetterIInMessage1.push(0);
        }
    }
    const numberOfSpacesPrecedingLetterIInMessage2 = [0];
    for(let i = 0; i<message2.length; i++){
        if (message2.charAt(i) === ' '){
            numberOfSpacesPrecedingLetterIInMessage2[numberOfSpacesPrecedingLetterIInMessage2.length-1] += 1;
        } else {
            numberOfSpacesPrecedingLetterIInMessage2.push(0);
        }
    }

    // stop early if either message is empty (or comprised of only spaces)
    if (message1.length === 0 || message2.length === 0) {
        requestRenderIfNotRequested();
        return;
    }

    // determine letter mapping from first message to second message
    const grid_data = determineM1M2LetterMapping(message1, message2);
    const message1Letters = grid_data[0];
    const message2Letters = grid_data[1];
    const doesLetteriOfMessage1Move = grid_data[2];
    const doesLetteriOfMessage2Move = grid_data[3];

    // load stls according to grid data
    let currentPosition = [0, 0];

    // letter_widths aren't exact so multiply them by experimentally found constant coefficient c
    const C = 3.0;

    let intersections_dir = './examples/jsm/models/stl/binary/';
    let m1CharacterIdx = 0, m2CharacterIdx = 0;
    for (let i = 0; i<message1Letters.length; i++) {
        let objectFileName = intersections_dir + message1Letters[i] + "_" + message2Letters[i] + ".stl";
        let dx = currentPosition[0]; let dz = currentPosition[1];
        // handle spacing
        if (!doesLetteriOfMessage1Move[m1CharacterIdx] || message1Letters[i].length === 1){
            dx += numberOfSpacesPrecedingLetterIInMessage1[m1CharacterIdx] * (C*letter_widths[' '] + spacing);
        }
        if (!doesLetteriOfMessage2Move[m2CharacterIdx] || message2Letters[i].length === 1){
            dz -= numberOfSpacesPrecedingLetterIInMessage2[m2CharacterIdx] * (C*letter_widths[' '] + spacing);
        }
        // continue to handle stuff
        if (i>0) {
            let moveX = doesLetteriOfMessage1Move[i-1];
            let moveZ = doesLetteriOfMessage2Move[i-1];
            if (moveX) {
                dx += C*letter_widths[message1Letters[i-1].charAt(0)] + spacing;
            }
            if (moveZ) {
                dz -= C*letter_widths[message2Letters[i-1].charAt(0)] + spacing;
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

        // increment character indices
        if (doesLetteriOfMessage1Move[i]){
            m1CharacterIdx++;
        }
        if (doesLetteriOfMessage2Move[i]){
            m2CharacterIdx++;
        }
    }

    // center the text
    new THREE.Box3().setFromObject( group ).getCenter( group.position ).multiplyScalar( - 1 );

    // add the group to the scene
    scene.add(group);
}


function processMesh(geometry, dx, dz) {
    const material = new THREE.MeshPhongMaterial( {color: color, specular: 0x000000, shininess: 0} );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.position.set( dx, 0, dz);
    mesh.rotation.set( -Math.PI / 2, 0, 0);
    mesh.scale.set( 3, 3, 3 );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    requestRenderIfNotRequested();
}
// ----- NEW WORLD BELOW -----

let scene, camera, renderer, loader, group, orbitControls, clock, currentAnimId;

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
    camera.position.set( 0, 0, camerasDistanceToOrigin ); // text mesh has height of 30 always
    camera.zoom = 3.6;
    camera.updateProjectionMatrix();
    window.camera = camera

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );
    // scene.fog = new THREE.Fog( 0xa0a0a0, 1, 1000 );

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

    // temporary empty group to remove
    group = new THREE.Group();
    scene.add(group);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    // determine the behaviour of camera
    orbitControls = new OrbitControls( camera, renderer.domElement );
    orbitControls.target.set( 0, 0, 0 );
    orbitControls.update();

    // Note: the 'Cycle Animation' flag automatically shuts off when you orbit the camera (this by design) but the
    // Event handler fires three times when the page is loaded, automatically cancelling isCycling=true when present
    // in the urlParams, so we're just going to explicitly ignore the first three firings
    let ignoreFirstKChanges = 3;
    orbitControls.addEventListener('change', ()=>{
        if(ignoreFirstKChanges > 0){
            ignoreFirstKChanges -= 1;
            return;
        }
        currentAnimId = 0; // cancels current animation if one's playing
        toggleCycleSwitch.setValue(false); // turns off cycle if one's happening
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

function interpolateCameraToTarget(endPosition) {
    // Starting position is wherever the camera is right now
    const startPosition = new THREE.Vector3().copy(camera.position);

    // reset the controls so that when the user clicks the screen, we rotate about the origin
    orbitControls.target.set( 0, 0, 0 );

    let animationDone = false;
    currentAnimId = Date.now();
    clock.start();
    const id = currentAnimId;

    const worldOrigin = new THREE.Vector3(0, 0, 0);
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

        // Lerp the camera position between start and end
        const currentPosition = new THREE.Vector3().lerpVectors(startPosition, endPosition, t);

        // Update the camera's position
        camera.position.copy(currentPosition);

        // Ensure the camera always looks at the origin
        camera.lookAt(worldOrigin);

        // Render the scene
        renderer.render(scene, camera);

        // When the animation reaches the target position (t === 1), stop the loop
        if (t === 1) {
            animationDone = true; // Set the flag to true to stop further animation
        }
    }
    animate();
}


function cycleBetweenViews(){
    const startPosition = new THREE.Vector3().copy(camera.position);
    const cycleStartPosition = new THREE.Vector3(0, 0, camerasDistanceToOrigin);
    const timeToSpendLookingAtCurrentMessage = 2000;
    const worldOrigin = new THREE.Vector3(0, 0, 0);
    const goToView1TransitionDurationSeconds = 1;
    const cycleTransitionDurationSeconds = 2;
    currentAnimId = Date.now();
    const id = currentAnimId;
    let phase = 0;

    // first, transition to the first view
    function animate0(){
        if(phase !== 0 || currentAnimId !== id){
            return;
        }
        requestAnimationFrame(animate0);
        const elapsedTime = clock.getElapsedTime();
        const t = Math.min(elapsedTime / goToView1TransitionDurationSeconds, 1);
        const currentPosition = new THREE.Vector3().lerpVectors(startPosition, cycleStartPosition, t);
        camera.position.copy(currentPosition);
        camera.lookAt(worldOrigin);
        renderer.render(scene, camera);
        if (t===1){ // phase 0 done
            phase = 1; // transition to phase 1
            setTimeout( ()=>{
                clock.start();
                animate1();
            }, timeToSpendLookingAtCurrentMessage);
        }
    }
    function animate1(){
        if(phase !== 1 || currentAnimId !== id){
            return;
        }
        requestAnimationFrame(animate1);
        const elapsedTime = clock.getElapsedTime();
        const t = Math.min(elapsedTime / cycleTransitionDurationSeconds, 1);
        const c= Math.cos(Math.PI * t), s = Math.sin(Math.PI * t);
        const currentPosition = new THREE.Vector3(
            camerasDistanceToOrigin * 0.5 * (1-c),
            camerasDistanceToOrigin * (Math.sqrt(2)/2) * s,
            camerasDistanceToOrigin * 0.5 * (1+c)
        );
        camera.position.copy(currentPosition);
        camera.lookAt(worldOrigin);
        renderer.render(scene, camera);
        if (t===1){ // phase 1 done
            phase = 2; // transition to phase 2
            setTimeout( ()=>{
                clock.start();
                animate2();
            }, timeToSpendLookingAtCurrentMessage);
        }
    }
    function animate2(){
        if(phase !== 2 || currentAnimId !== id){
            return;
        }
        requestAnimationFrame(animate2);
        const elapsedTime = clock.getElapsedTime();
        const t = Math.min(elapsedTime / cycleTransitionDurationSeconds, 1);
        const c= Math.cos(Math.PI * t), s = Math.sin(Math.PI * t);
        const currentPosition = new THREE.Vector3(
            camerasDistanceToOrigin * 0.5 * (1+c),
            camerasDistanceToOrigin * (-Math.sqrt(2)/2) * s,
            camerasDistanceToOrigin * 0.5 * (1-c)
        );
        camera.position.copy(currentPosition);
        camera.lookAt(worldOrigin);
        renderer.render(scene, camera);
        if (t===1){ // phase 2 done
            phase = 1; // transition back to phase 1
            setTimeout( ()=>{
                clock.start();
                animate1();
            }, timeToSpendLookingAtCurrentMessage);
        }
    }
    clock.start();
    animate0();
    // if ( // skip phase 1 if camera is already at
    //     Math.abs(camera.position.x)
    //     + Math.abs(camera.position.y)
    //     + Math.abs(camera.position.z-camerasDistanceToOrigin) < 1.0e-10
    // ){
    //     phase = 1;
    //     animate1();
    // } else {
    //     animate0();
    // }
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
    orbitControls.update();
    renderer.render(scene, camera);
}


function requestRenderIfNotRequested() {
    if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(render);
    }
}

document.addEventListener("DOMContentLoaded", ()=>{
    const isCyclingInitially = isCycling;
    init();
    setTimeout(refreshText, 20); // for some reason text doesn't display properly sometimes
    if(isCyclingInitially){
        isCycling = true;
        toggleCycleSwitch.setValue(isCycling);
    }
});
console.log("Programmed by:\nOmri Shavit\nAlexandru Munteanu");
