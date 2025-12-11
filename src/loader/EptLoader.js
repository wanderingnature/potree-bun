/**
 * @author Connor Manning
 */

export class EptLoader {
	static async load(file, callback) {

		let response = await fetch(file);
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('/ept.json'));
		let geometry = new Potree.PointCloudEptGeometry(url, json);
		let root = new Potree.PointCloudCopcGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

export class CopcLoader {
	static async load(file, callback) {
		const { Copc, Getter, Las } = window.Copc

		const url = file;
		const getter = Getter.http(url);
		const copc = await Copc.create(getter);

		let geometry = new Potree.PointCloudCopcGeometry(getter, copc);
		let root = new Potree.PointCloudCopcGeometryNode(geometry);

		// Extract custom scene metadata from VLR (user_id: "MYAPP", record_id: 60000)
		try {
			const header = copc.header;
			const get = async (begin, end) => {
				const data = await getter(begin, end);
				return new Uint8Array(data);
			};
			const vlrs = await Las.Vlr.walk(get, header);
			const sceneVlr = Las.Vlr.find(vlrs, 'MYAPP', 60000);
			if (sceneVlr) {
				const vlrData = await Las.Vlr.fetch(get, sceneVlr);
				const jsonStr = new TextDecoder().decode(vlrData);
				geometry.sceneMetadata = JSON.parse(jsonStr);
				console.log('Scene metadata loaded:', geometry.sceneMetadata);
			}
		} catch (e) {
			console.log('No custom scene metadata found or error reading VLR:', e.message);
		}

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
}
