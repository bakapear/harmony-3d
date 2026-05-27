import { BinaryReader } from 'harmony-binary-reader';

export interface SourcePhyFace {
	vertexIndex: [number, number, number];
}

export interface SourcePhyConvexMesh {
	boneIndex: number;
	flags: number;
	faces: SourcePhyFace[];
}

export interface SourcePhyCollisionData {
	convexMeshes: SourcePhyConvexMesh[];
	vertices: Float32Array;
	vertexIdToIndex: Map<number, number>;
}

export interface SourcePhyFileData {
	size: number;
	id: number;
	solidCount: number;
	checksum: number;
	collisionDatas: SourcePhyCollisionData[];
}

export class Source1PhyFile {
	static parse(reader: BinaryReader): SourcePhyFileData | null {
		const fileOffsetStart = reader.tell();

		const size = reader.getInt32();
		const id = reader.getInt32();
		const solidCount = reader.getInt32();
		const checksum = reader.getInt32();

		const phyData: SourcePhyFileData = {
			size,
			id,
			solidCount,
			checksum,
			collisionDatas: []
		};

		reader.seek(fileOffsetStart + size);

		for (let solidIndex = 0; solidIndex < solidCount; solidIndex++) {
			const collisionData = readCollisionData(reader);
			if (collisionData) {
				phyData.collisionDatas.push(collisionData);
			}
		}

		return phyData;
	}
}

function readCollisionData(reader: BinaryReader): SourcePhyCollisionData | null {
	const solidStart = reader.tell();
	const solidSize = reader.getInt32();
	const nextSolidPos = reader.tell() + solidSize;

	const phyDataPos = reader.tell();
	const vphyId = reader.getString(4);
	reader.seek(phyDataPos);

	if (vphyId === 'VPHY') {
		readVphyVersion48(reader);
	} else {
		readVphyVersion37(reader);
	}

	const ivpsId = reader.getString(4);
	if (ivpsId !== 'IVPS') {
		reader.seek(nextSolidPos);
		return null;
	}

	const collisionData: SourcePhyCollisionData = {
		convexMeshes: [],
		vertices: new Float32Array(0),
		vertexIdToIndex: new Map()
	};

	const orderedVertexIds: number[] = [];
	let vertexDataStreamPos = reader.tell() + solidSize;

	while (reader.tell() < vertexDataStreamPos) {
		const faceDataPos = reader.tell();
		const vertexDataOffset = reader.getInt32();
		vertexDataStreamPos = faceDataPos + vertexDataOffset;

		const convexMesh: SourcePhyConvexMesh = {
			boneIndex: reader.getInt32() - 1,
			flags: reader.getInt32(),
			faces: []
		};

		const triangleCount = reader.getInt32();

		for (let i = 0; i < triangleCount; i++) {
			const face: SourcePhyFace = { vertexIndex: [0, 0, 0] };
			reader.getUint8();
			reader.getUint8();
			reader.getUint16();

			for (let j = 0; j < 3; j++) {
				const v = reader.getUint16();
				face.vertexIndex[j] = v;
				reader.getUint16();
				if (!orderedVertexIds.includes(v)) {
					orderedVertexIds.push(v);
				}
			}
			convexMesh.faces.push(face);
		}
		collisionData.convexMeshes.push(convexMesh);
	}

	reader.seek(vertexDataStreamPos);

	const vertexCount = orderedVertexIds.length;
	const vertexArray = new Float32Array(vertexCount * 3);

	for (let i = 0; i < vertexCount; i++) {
		const x = reader.getFloat32();
		const y = reader.getFloat32();
		const z = reader.getFloat32();
		reader.getFloat32();
		const idx = i * 3;
		vertexArray[idx] = x;
		vertexArray[idx + 1] = y;
		vertexArray[idx + 2] = z;
		collisionData.vertexIdToIndex.set(orderedVertexIds[i]!, i);
	}

	collisionData.vertices = vertexArray;

	reader.seek(nextSolidPos);
	return collisionData;
}

function readVphyVersion37(reader: BinaryReader): void {
	for (let i = 0; i < 11; i++) {
		reader.getInt32();
	}
}

function readVphyVersion48(reader: BinaryReader): void {
	reader.getString(4);
	reader.getUint16();
	reader.getUint16();
	for (let i = 0; i < 16; i++) {
		reader.getInt32();
	}
}
