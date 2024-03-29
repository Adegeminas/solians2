import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as Actions from '../actions';
import * as THREE from 'three';

class WebGLComponent extends React.Component {
  constructor(props) {
    super(props);

    this.s = {
      background: {
        width: '100%',
        height: '100%'
      }
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.canvas = this.renderer.domElement;
    this.textureLoader = new THREE.TextureLoader();
    this.renderer.setSize(800, 600);
    this.camera.position.z = 11;
    this.camera.position.x = 5;
    this.camera.position.y = 0;
    this.camera.lookAt(5, 5, 0);
    this.solians = new THREE.Object3D();
    this.solians.name = 'solians';
    this.fields = new THREE.Object3D();
    this.fields.name = 'fields';

    this.rayCaster = new THREE.Raycaster();

    this.canvas.onclick = function getClicked3DPoint(evt) {
      evt.preventDefault();

      const mousePosition = new THREE.Vector2();

      mousePosition.x = ((evt.clientX) / this.canvas.width) * 2 - 1;
      mousePosition.y = -((evt.clientY) / this.canvas.height) * 2 + 1;

      this.rayCaster.setFromCamera(mousePosition, this.camera);

      const intersects = this.rayCaster.intersectObjects(this.scene.getObjectByName('solians').children, true);
      let point = null;

      if (intersects.length > 0) {
        point = intersects[0].point;

        const obj = this.props.ws[Math.ceil(point.x) - 1][Math.ceil(point.y) - 1].object;

        this.props.selectCurrentObject(obj);
      }
    }.bind(this);

    this.canvas.oncontextmenu = function (evt) {
      evt.preventDefault();

      const mousePosition = new THREE.Vector2();

      mousePosition.x = ((evt.clientX) / this.canvas.width) * 2 - 1;
      mousePosition.y = -((evt.clientY) / this.canvas.height) * 2 + 1;

      this.rayCaster.setFromCamera(mousePosition, this.camera);

      const intersects = this.rayCaster.intersectObjects(this.scene.getObjectByName('fields').children, true);
      let point = null;

      if (intersects.length > 0) {
        point = intersects[0].point;

        // console.log(Math.ceil(point.x) - 1, Math.ceil(point.y) - 1);

        if (!this.props.obj) return;
        const dx = -this.props.obj.x + Math.ceil(point.x) - 1;
        const dy = -this.props.obj.y + Math.ceil(point.y) - 1;

        console.log(this.props.obj, dx, dy);

        this.props.socket.emit('move', this.props.obj, dx, dy);
      }
    }.bind(this);
  }

  async componentDidMount() {
    document.getElementById('div').appendChild(this.renderer.domElement);
    // document.getElementById('div').appendChild(this.paliter);

    this.fieldTexture1 = await this.syncLoadTexture('./0.png');
    this.fieldTexture0 = await this.syncLoadTexture('./1.png');
    this.fieldMaterial0 = new THREE.MeshBasicMaterial({ map:  this.fieldTexture0});
    this.fieldMaterial1 = new THREE.MeshBasicMaterial({ map:  this.fieldTexture1});
    this.fieldGeometry0 = new THREE.PlaneGeometry(1, 1);
    this.fieldGeometry1 = new THREE.BoxGeometry(1, 1, 1);
    this.solianGeometry = new THREE.BoxGeometry(1, 1, 1);


    // this.solianTexture = await this.syncLoadTexture('./animations.png');
    const animations = new Image(512, 320);

    animations.src = './animations.png';

    animations.onload = function () {
      this.animations = animations;
      this.animate();
    }.bind(this);

    // this.animate();
  }

  syncLoadTexture(path) {
    return new Promise(function (resolve, reject) {
      this.textureLoader.load(
        path,
        function (texture) {
          resolve(texture);
        },
        undefined,
        function (err) {
          console.log('ОШИБИЩЕ: ', err);
          reject(err);
        }
      );
    }.bind(this));
  }

  column(direction) {
    return direction === 'n' ? 6 :
      direction === 'ne' ? 5 :
        direction === 'e' ? 0 :
          direction === 'se' ? 1 :
            direction === 's' ? 2 :
              direction === 'nw' ? 7 :
                direction === 'w' ? 4 : 3;
  }

  addField(type, x, y) {
    const field = type ?
      new THREE.Mesh(this.fieldGeometry1, this.fieldMaterial0) :
      new THREE.Mesh(this.fieldGeometry0, this.fieldMaterial1);

    field.position.x = x + 0.5;
    field.position.y = y + 0.5;
    field.position.z = -0.5;

    this.fields.add(field);
  }

  addSolian(x, y, s) {
    const paliter = document.createElement('canvas');
    const ctx = paliter.getContext('2d');

    paliter.height = 64;
    paliter.width = 64;

    if (s.state === 'standing') {
      const frame = (new Date()).getSeconds() % 7;

      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(this.animations, 64 * frame, 0, 64, 64,
        0, 0, 64, 64);

      const tex = new THREE.CanvasTexture(paliter);
      const solianMaterial = new THREE.MeshBasicMaterial({ map:  tex});
      const solian = new THREE.Mesh(this.solianGeometry, solianMaterial);

      solian.position.x = x + 0.5;
      solian.position.y = y + 0.5;

      this.solians.add(solian);
    } else {
      const column = this.column(s.direction);
      let frame = Math.floor((s.frames - 1) * (Date.now() - this.props.lag - s.movingStartTime) / s.speed);

      if (frame > s.frames - 1) frame = s.frames - 1;

      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(this.animations, 64 * column, 64 * frame, 64, 64,
        0, 0, 64, 64);

      const tex = new THREE.CanvasTexture(paliter);
      const solianMaterial = new THREE.MeshBasicMaterial({ map:  tex});
      const solian = new THREE.Mesh(this.solianGeometry, solianMaterial);

      solian.position.x = x + 0.5;
      solian.position.y = y + 0.5;

      this.solians.add(solian);
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.solians = new THREE.Object3D();
    this.solians.name = 'solians';
    this.fields = new THREE.Object3D();
    this.fields.name = 'fields';

    this.scene.add(new THREE.AxesHelper(20));

    if (this.props.ws) {
      this.props.ws.forEach((row, iX) => {
        row.forEach((field, iY) => {
          this.addField(field.type, iX, iY);
        });
      });

      this.props.ws.forEach((row, iX) => {
        row.forEach((field, iY) => {
          if (field.object) {
            const s = field.object;

            if (s.state === 'standing') {
              this.addSolian(iX, iY, s);
            } else {
              let frame = Math.floor((s.frames - 1) * (Date.now() - this.props.lag - s.movingStartTime) / s.speed);

              if (frame > s.frames - 1) frame = s.frames - 1;

              this.addSolian(iX + s.dir[0] * frame / 4, iY + s.dir[1] * frame / 4, s);
            }
          }
        });
      });
      this.scene.add(this.fields);
      this.scene.add(this.solians);
    }

    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return (
      <div id = 'div' style = { this.s.background } />
    );
  }
}

export default connect(
  state => {
    return {
      ws: JSON.parse(state.appState.worldState),
      ts: state.appState.timeStamp,
      lag: state.appState.serverLag,
      obj: state.appState.currentObj,
      length: state.appState.mapLength,
      corner: state.appState.mapCorner,
      MAX_RANGE: state.appState.MAX_RANGE
    };
  },
  dispatch => bindActionCreators(Actions, dispatch)
)(WebGLComponent);
