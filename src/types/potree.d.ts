/**
 * Type declarations for Potree
 * WebGL 2.0 point cloud renderer built on Three.js
 */

import * as THREE from 'three';

// ============================================================================
// Core Types
// ============================================================================

export interface PotreeVersion {
	major: number;
	minor: number;
	suffix: string;
}

export interface PointCloudLoadEvent {
	type: 'pointcloud_loaded';
	pointcloud: PointCloudOctree;
}

export type LoadCallback = (event: PointCloudLoadEvent) => void;

// ============================================================================
// FetchFactory
// ============================================================================

export interface FetchFactoryConfig {
	withCredentials: boolean;
	customHeaders: Array<{ header: string | null; value: string | null }>;
}

export interface FetchFactoryType {
	config: FetchFactoryConfig;
	getOptions(additionalOptions?: RequestInit): RequestInit;
	fetchJson<T = unknown>(url: string): Promise<T>;
	fetchArrayBuffer(url: string): Promise<ArrayBuffer>;
	fetchText(url: string): Promise<string>;
	pathExists(url: string): Promise<boolean>;
	fetch(url: string, options?: RequestInit): Promise<Response>;
}

export const FetchFactory: FetchFactoryType;

// ============================================================================
// XHRFactory (Legacy - kept for backwards compatibility)
// ============================================================================

export interface XHRFactoryConfig {
	withCredentials: boolean;
	customHeaders: Array<{ header: string | null; value: string | null }>;
}

export interface XHRFactoryType {
	config: XHRFactoryConfig;
	createXMLHttpRequest(): XMLHttpRequest;
}

export const XHRFactory: XHRFactoryType;

// ============================================================================
// Point Attributes
// ============================================================================

export interface PointAttributeType {
	ordinal: number;
	name: string;
	size: number;
}

export const PointAttributeTypes: {
	DATA_TYPE_DOUBLE: PointAttributeType;
	DATA_TYPE_FLOAT: PointAttributeType;
	DATA_TYPE_INT8: PointAttributeType;
	DATA_TYPE_UINT8: PointAttributeType;
	DATA_TYPE_INT16: PointAttributeType;
	DATA_TYPE_UINT16: PointAttributeType;
	DATA_TYPE_INT32: PointAttributeType;
	DATA_TYPE_UINT32: PointAttributeType;
	DATA_TYPE_INT64: PointAttributeType;
	DATA_TYPE_UINT64: PointAttributeType;
};

export class PointAttribute {
	name: string;
	type: PointAttributeType;
	numElements: number;
	byteSize: number;
	range: [number, number];
	initialRange: [number, number] | null;

	constructor(name: string, type: PointAttributeType, numElements: number);
}

export class PointAttributes {
	attributes: PointAttribute[];
	byteSize: number;
	size: number;

	constructor(pointAttributes?: PointAttribute[]);
	add(pointAttribute: PointAttribute): void;
	addVector(vector: { name: string; attributes: string[] }): void;
}

// ============================================================================
// Geometry Classes
// ============================================================================

export class PointCloudOctreeGeometry {
	url: string | null;
	octreeDir: string | null;
	spacing: number;
	boundingBox: THREE.Box3 | null;
	tightBoundingBox: THREE.Box3 | null;
	boundingSphere: THREE.Sphere | null;
	tightBoundingSphere: THREE.Sphere | null;
	root: PointCloudOctreeGeometryNode | null;
	nodes: Record<string, PointCloudOctreeGeometryNode> | null;
	pointAttributes: PointAttributes | null;
	hierarchyStepSize: number;
	loader: BinaryLoader | LasLazLoader | null;
	projection: string | null;
	offset: THREE.Vector3 | null;
}

export class PointCloudOctreeGeometryNode {
	id: number;
	name: string;
	index: number;
	pcoGeometry: PointCloudOctreeGeometry;
	geometry: THREE.BufferGeometry | null;
	boundingBox: THREE.Box3;
	boundingSphere: THREE.Sphere;
	children: Record<number, PointCloudOctreeGeometryNode>;
	numPoints: number;
	level: number | null;
	loaded: boolean;
	loading: boolean;
	spacing: number;
	hasChildren: boolean;

	constructor(name: string, pcoGeometry: PointCloudOctreeGeometry, boundingBox: THREE.Box3);

	isGeometryNode(): boolean;
	isTreeNode(): boolean;
	isLoaded(): boolean;
	getLevel(): number | null;
	getBoundingSphere(): THREE.Sphere;
	getBoundingBox(): THREE.Box3;
	getChildren(): PointCloudOctreeGeometryNode[];
	getURL(): string;
	getHierarchyPath(): string;
	addChild(child: PointCloudOctreeGeometryNode): void;
	load(): void;
	loadPoints(): void;
	loadHierachyThenPoints(): Promise<void>;
	getNumPoints(): number;
	dispose(): void;
}

// ============================================================================
// Point Cloud Classes
// ============================================================================

export class PointCloudOctree extends THREE.Object3D {
	pcoGeometry: PointCloudOctreeGeometry;
	boundingBox: THREE.Box3;
	boundingSphere: THREE.Sphere;
	material: PointCloudMaterial;
	visibleNodes: PointCloudOctreeNode[];
	visibleGeometry: PointCloudOctreeGeometryNode[];
	numVisibleNodes: number;
	numVisiblePoints: number;
	root: PointCloudOctreeNode | null;

	constructor(geometry: PointCloudOctreeGeometry, material?: PointCloudMaterial);

	getAttribute(name: string): PointAttribute | undefined;
	pick(viewer: Viewer, camera: THREE.Camera, ray: THREE.Ray, params?: PickParams): PickResult | null;
	dispose(): void;
}

export class PointCloudOctreeNode extends THREE.Object3D {
	geometryNode: PointCloudOctreeGeometryNode;
	sceneNode: THREE.Points | null;
	children: PointCloudOctreeNode[];

	getLevel(): number | null;
	isLoaded(): boolean;
	getBoundingSphere(): THREE.Sphere;
	getBoundingBox(): THREE.Box3;
}

// ============================================================================
// Material Classes
// ============================================================================

export class PointCloudMaterial extends THREE.RawShaderMaterial {
	pointSizeType: PointSizeType;
	shape: PointShape;
	pointSize: number;
	minSize: number;
	maxSize: number;
	activeAttributeName: string;
	color: THREE.Color;
	opacity: number;
	weighted: boolean;

	elevationRange: [number, number];
	heightMin: number;
	heightMax: number;

	intensityRange: [number, number];
	intensityGamma: number;
	intensityContrast: number;
	intensityBrightness: number;

	rgbGamma: number;
	rgbContrast: number;
	rgbBrightness: number;

	gradient: THREE.Texture | null;

	constructor(parameters?: PointCloudMaterialParameters);

	setClipBoxes(clipBoxes: ClipBox[]): void;
	setClipPolygons(clipPolygons: ClipPolygon[]): void;
}

export interface PointCloudMaterialParameters {
	size?: number;
	minSize?: number;
	maxSize?: number;
}

export class EyeDomeLightingMaterial extends THREE.RawShaderMaterial {
	screenWidth: number;
	screenHeight: number;
	edlStrength: number;
	radius: number;
	opacity: number;

	constructor(parameters?: object);
}

// ============================================================================
// Loaders
// ============================================================================

export class POCLoader {
	static load(url: string, callback: (geometry: PointCloudOctreeGeometry | undefined) => void): Promise<void>;
	loadPointAttributes(mno: object): PointAttributes;
	createChildAABB(aabb: THREE.Box3, index: number): THREE.Box3;
}

export class OctreeLoader {
	static load(url: string): Promise<{ geometry: PointCloudOctreeGeometry }>;
}

export class EptLoader {
	static load(url: string, callback: (geometry: PointCloudEptGeometry | undefined) => void): Promise<void>;
}

export class CopcLoader {
	static load(url: string, callback: (geometry: PointCloudEptGeometry | undefined) => void): Promise<void>;
}

export class BinaryLoader {
	version: Version;
	boundingBox: THREE.Box3;
	scale: number;

	constructor(version: string | Version, boundingBox: THREE.Box3, scale: number);
	load(node: PointCloudOctreeGeometryNode): Promise<void>;
	parse(node: PointCloudOctreeGeometryNode, buffer: ArrayBuffer): void;
}

export class LasLazLoader {
	version: Version;
	extension: string;

	constructor(version: string | Version, extension: string);
	load(node: PointCloudOctreeGeometryNode): Promise<void>;
	parse(node: PointCloudOctreeGeometryNode, buffer: ArrayBuffer): Promise<void>;

	static progressCB(): void;
}

// ============================================================================
// EPT Geometry
// ============================================================================

export class PointCloudEptGeometry {
	url: string;
	spacing: number;
	boundingBox: THREE.Box3;
	tightBoundingBox: THREE.Box3;
	boundingSphere: THREE.Sphere;
	projection: string | null;
	root: PointCloudEptGeometryNode | null;
	schema: EptSchema;
	eptScale: THREE.Vector3;
	eptOffset: THREE.Vector3;
}

export class PointCloudEptGeometryNode {
	ept: PointCloudEptGeometry;
	key: EptKey;
	loaded: boolean;
	loading: boolean;
	numPoints: number;

	url(): string;
	load(): Promise<void>;
}

export interface EptSchema {
	[key: string]: {
		name: string;
		type: string;
		size: number;
	};
}

export interface EptKey {
	b: THREE.Box3;
	d: number;
	x: number;
	y: number;
	z: number;
}

// ============================================================================
// Viewer
// ============================================================================

export class Viewer extends THREE.EventDispatcher {
	renderArea: HTMLElement;
	renderer: THREE.WebGLRenderer;
	scene: Scene;
	inputHandler: InputHandler;

	constructor(domElement: HTMLElement, args?: ViewerArgs);

	setDescription(description: string): void;
	setLanguage(lang: string): void;
	setPointBudget(budget: number): void;
	getPointBudget(): number;
	setBackground(background: string): void;
	setEDLEnabled(enabled: boolean): void;
	setEDLRadius(radius: number): void;
	setEDLStrength(strength: number): void;
	setEDLOpacity(opacity: number): void;
	setFOV(fov: number): void;
	getFOV(): number;
	setClipTask(task: ClipTask): void;
	setClipMethod(method: ClipMethod): void;
	setNavigationMode(mode: NavigationMode): void;

	loadPointCloud(path: string, name: string, callback?: LoadCallback): Promise<PointCloudLoadEvent>;
	fitToScreen(duration?: number): void;
	toggleSidebar(): void;

	update(delta: number, timestamp: number): void;
	loop(timestamp: number): void;
	render(): void;
}

export interface ViewerArgs {
	useDefaultRenderLoop?: boolean;
	noDragAndDrop?: boolean;
}

export class Scene extends THREE.EventDispatcher {
	scene: THREE.Scene;
	scenePointCloud: THREE.Scene;
	sceneBG: THREE.Scene;

	pointclouds: PointCloudOctree[];
	measurements: Measure[];
	profiles: Profile[];
	volumes: Volume[];
	cameraAnimations: CameraAnimation[];

	view: View;
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	cameraP: THREE.PerspectiveCamera;
	cameraO: THREE.OrthographicCamera;

	addPointCloud(pointcloud: PointCloudOctree): void;
	removePointCloud(pointcloud: PointCloudOctree): void;
	getActiveCamera(): THREE.Camera;
}

export class View {
	position: THREE.Vector3;
	yaw: number;
	pitch: number;
	radius: number;
	maxPitch: number;
	minPitch: number;

	lookAt(target: THREE.Vector3): void;
}

// ============================================================================
// Tools and Utilities
// ============================================================================

export class Measure extends THREE.Object3D {
	points: THREE.Vector3[];
	closed: boolean;
	showDistances: boolean;
	showAngles: boolean;
	showCoordinates: boolean;
	showArea: boolean;
	showHeight: boolean;
	showCircle: boolean;
	showAzimuth: boolean;
	showEdges: boolean;
	maxMarkers: number;

	addMarker(point: THREE.Vector3): void;
	removeMarker(index: number): void;
	getArea(): number;
}

export class Profile extends THREE.Object3D {
	points: THREE.Vector3[];
	width: number;
	height: number;

	addMarker(point: THREE.Vector3): void;
	removeMarker(index: number): void;
}

export class Volume extends THREE.Object3D {
	clip: boolean;
	visible: boolean;

	constructor(args?: VolumeArgs);
}

export interface VolumeArgs {
	clip?: boolean;
	visible?: boolean;
}

export class MeasuringTool extends THREE.EventDispatcher {
	viewer: Viewer;

	constructor(viewer: Viewer);

	startInsertion(args?: MeasureInsertionArgs): Measure;
}

export interface MeasureInsertionArgs {
	showDistances?: boolean;
	showAngles?: boolean;
	showCoordinates?: boolean;
	showArea?: boolean;
	showHeight?: boolean;
	closed?: boolean;
	maxMarkers?: number;
}

export class ProfileTool extends THREE.EventDispatcher {
	viewer: Viewer;

	constructor(viewer: Viewer);

	startInsertion(args?: ProfileInsertionArgs): Profile;
}

export interface ProfileInsertionArgs {
	width?: number;
}

export class VolumeTool extends THREE.EventDispatcher {
	viewer: Viewer;

	constructor(viewer: Viewer);

	startInsertion(args?: VolumeInsertionArgs): Volume;
}

export interface VolumeInsertionArgs {
	clip?: boolean;
}

export class ClippingTool extends THREE.EventDispatcher {
	viewer: Viewer;

	constructor(viewer: Viewer);
}

// ============================================================================
// Utility Classes
// ============================================================================

export class Version {
	version: string;
	versionMajor: number;
	versionMinor: number;

	constructor(version: string);

	newerThan(version: string): boolean;
	equalOrHigher(version: string): boolean;
	upTo(version: string): boolean;
}

export class LRU<T = unknown> {
	maxNodes: number;
	numNodes: number;
	first: LRUItem<T> | null;
	last: LRUItem<T> | null;
	items: Map<unknown, LRUItem<T>>;

	constructor(maxNodes?: number);

	touch(node: T): void;
	remove(node: T): void;
	getLRU(): T | null;
	dispose(): void;
}

export interface LRUItem<T> {
	node: T;
	previous: LRUItem<T> | null;
	next: LRUItem<T> | null;
}

export class WorkerPool {
	workers: Map<string, Worker[]>;

	constructor();

	getWorker(workerPath: string): Worker;
	returnWorker(workerPath: string, worker: Worker): void;
}

export class Utils {
	static loadShapefileFeatures(file: string, callback: (features: GeoJSONFeature[]) => void): Promise<void>;
	static toString(value: THREE.Vector3 | number): string;
	static normalizeURL(url: string): string;
	static pathExists(url: string): Promise<boolean>;
	static debugSphere(parent: THREE.Object3D, position: THREE.Vector3, scale: number, color?: number): THREE.Mesh;
	static debugLine(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, color: number): { node: THREE.Line; set: (start: THREE.Vector3, end: THREE.Vector3) => void };
	static computeTransformedBoundingBox(box: THREE.Box3, transform: THREE.Matrix4): THREE.Box3;
	static addCommas(nStr: string | number): string;
	static removeCommas(str: string): string;
	static createWorker(code: string): Worker;
	static createGrid(width: number, length: number, spacing: number, color?: number): THREE.LineSegments;
	static frustumSphereIntersection(frustum: THREE.Frustum, sphere: THREE.Sphere): 0 | 1 | 2;
	static generateDataTexture(width: number, height: number, color: THREE.Color): THREE.DataTexture;
	static getParameterByName(name: string): string | null;
	static setParameter(name: string, value: string): void;
	static createChildAABB(aabb: THREE.Box3, index: number): THREE.Box3;
	static clipboardCopy(text: string): void;
	static getMeasurementIcon(measurement: Measure | Profile | Volume | PolygonClipVolume): string;
	static computeCircleCenter(A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3): THREE.Vector3;
	static computeAzimuth(p1: THREE.Vector3, p2: THREE.Vector3, projection?: string): number;
	static loadScript(url: string): Promise<void>;
}

// ============================================================================
// Enums and Constants
// ============================================================================

export enum PointSizeType {
	FIXED = 0,
	ATTENUATED = 1,
	ADAPTIVE = 2,
}

export enum PointShape {
	SQUARE = 0,
	CIRCLE = 1,
	PARABOLOID = 2,
}

export enum ClipTask {
	NONE = 0,
	HIGHLIGHT = 1,
	SHOW_INSIDE = 2,
	SHOW_OUTSIDE = 3,
}

export enum ClipMethod {
	INSIDE_ANY = 0,
	INSIDE_ALL = 1,
}

export type NavigationMode = 'Orbit' | 'FirstPerson' | 'Earth' | 'VR';

// ============================================================================
// Interfaces for Internal Use
// ============================================================================

export interface PickParams {
	pickClipped?: boolean;
	x?: number;
	y?: number;
}

export interface PickResult {
	position: THREE.Vector3;
	distance: number;
	index: number;
	pointcloud: PointCloudOctree;
}

export interface ClipBox {
	box: THREE.Box3;
	inverse: boolean;
}

export interface ClipPolygon {
	polygon: THREE.Vector3[];
	inverse: boolean;
}

export interface GeoJSONFeature {
	type: 'Feature';
	geometry: object;
	properties?: object;
}

export interface InputHandler {
	enabled: boolean;
	drag: THREE.Vector3 | null;
}

export interface CameraAnimation {
	duration: number;
	t: number;
	controlPoints: THREE.Vector3[];
}

export interface PolygonClipVolume extends THREE.Object3D {
	polygon: THREE.Vector3[];
}

// ============================================================================
// Module Exports
// ============================================================================

export const version: PotreeVersion;
export const workerPool: WorkerPool;
export let lru: LRU;
export let pointBudget: number;
export let framenumber: number;
export let numNodesLoading: number;
export let maxNodesLoading: number;
export const debug: object;
export const scriptPath: string;
export const resourcePath: string;

export function loadPointCloud(path: string, name: string, callback?: LoadCallback): Promise<PointCloudLoadEvent>;
