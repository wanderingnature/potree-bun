
import * as THREE from "three";
import {FetchFactory} from "../../FetchFactory.js";

export class EptBinaryLoader {
	extension() {
		return '.bin';
	}

	workerPath() {
		return Potree.scriptPath + '/workers/EptBinaryDecoderWorker.js';
	}

	async load(node) {
		if (node.loaded) return;

		let url = node.url() + this.extension();

		try {
			const buffer = await FetchFactory.fetchArrayBuffer(url);
			this.parse(node, buffer);
		} catch (e) {
			console.log('Failed ' + url + ': ' + e);
		}
	}

	parse(node, buffer) {
		let workerPath = this.workerPath();
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function(e) {
			let g = new THREE.BufferGeometry();
			let numPoints = e.data.numPoints;

			let position = new Float32Array(e.data.position);
			g.setAttribute('position', new THREE.BufferAttribute(position, 3));

			let indices = new Uint8Array(e.data.indices);
			g.setAttribute('indices', new THREE.BufferAttribute(indices, 4));

			if (e.data.color) {
				let color = new Uint8Array(e.data.color);
				g.setAttribute('color', new THREE.BufferAttribute(color, 4, true));
			}
			if (e.data.intensity) {
				let intensity = new Float32Array(e.data.intensity);
				g.setAttribute('intensity',
						new THREE.BufferAttribute(intensity, 1));
			}
			if (e.data.classification) {
				let classification = new Uint8Array(e.data.classification);
				g.setAttribute('classification',
						new THREE.BufferAttribute(classification, 1));
			}
			if (e.data.returnNumber) {
				let returnNumber = new Uint8Array(e.data.returnNumber);
				g.setAttribute('return number',
						new THREE.BufferAttribute(returnNumber, 1));
			}
			if (e.data.numberOfReturns) {
				let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
				g.setAttribute('number of returns',
						new THREE.BufferAttribute(numberOfReturns, 1));
			}
			if (e.data.pointSourceId) {
				let pointSourceId = new Uint16Array(e.data.pointSourceId);
				g.setAttribute('source id',
						new THREE.BufferAttribute(pointSourceId, 1));
			}

			g.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			node.doneLoading(
					g,
					tightBoundingBox,
					numPoints,
					new THREE.Vector3(...e.data.mean));

			Potree.workerPool.returnWorker(workerPath, worker);
		};

		let toArray = (v) => [v.x, v.y, v.z];
		let message = {
			buffer: buffer,
			schema: node.ept.schema,
			scale: node.ept.eptScale,
			offset: node.ept.eptOffset,
			mins: toArray(node.key.b.min)
		};

		worker.postMessage(message, [message.buffer]);
	}
};

