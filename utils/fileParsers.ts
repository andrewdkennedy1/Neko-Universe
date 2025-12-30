/**
 * Professional Icon Extraction Utilities
 * Supports:
 * - PE (Portable Executable) 32-bit/64-bit (.dll, .exe, .icl)
 * - NE (New Executable) 16-bit (.icl, .dll)
 * - Raw Binary Ripping (PNG & BMP signatures)
 */

const readU8 = (dv: DataView, offset: number) => dv.getUint8(offset);
const readU16 = (dv: DataView, offset: number) => dv.getUint16(offset, true);
const readU32 = (dv: DataView, offset: number) => dv.getUint32(offset, true);
const readI32 = (dv: DataView, offset: number) => dv.getInt32(offset, true);

interface IconResource {
  url: string;
  format: string;
}

export const parseFileForIcons = async (file: File): Promise<IconResource[]> => {
  try {
    const buffer = await file.arrayBuffer();
    const dv = new DataView(buffer);
    
    // 1. Basic DOS Header Check
    if (buffer.byteLength < 64 || readU16(dv, 0) !== 0x5A4D) { // 'MZ'
      return ripImagesFromBinary(buffer);
    }

    const peOffset = readU32(dv, 0x3C);
    
    // Bounds check
    if (peOffset + 2 > buffer.byteLength) {
        return ripImagesFromBinary(buffer);
    }

    const signature = readU16(dv, peOffset);

    // 2. Route based on Signature
    if (signature === 0x4550) { // "PE"
      const icons = await parsePE(dv, peOffset);
      if (icons.length > 0) return icons;
    } else if (signature === 0x454E) { // "NE"
      const icons = await parseNE(dv, peOffset);
      if (icons.length > 0) return icons;
    }

    // 3. Fallback
    console.warn("Header found but parsing returned no results. Trying raw scan.");
    return ripImagesFromBinary(buffer);

  } catch (e) {
    console.warn("Parse failed, falling back to raw rip:", e);
    // Try to recover with raw rip if file read succeeded
    return ripImagesFromBinary(await file.arrayBuffer());
  }
};

// --- PE Parsing (32/64-bit) ---

const parsePE = async (dv: DataView, peOffset: number): Promise<IconResource[]> => {
  const magic = readU16(dv, peOffset + 24);
  const is64 = magic === 0x20b;
  
  // Data Directory for Resources is usually index 2.
  // Standard Optional Header sizes: 32bit (96 bytes offset to DD), 64bit (112 bytes offset to DD)
  // Base of Optional Header is peOffset + 24
  const ddBase = peOffset + 24 + (is64 ? 112 : 96);
  const rsrcRVA = readU32(dv, ddBase + 16); 
  
  if (!rsrcRVA) return [];

  // Section Table
  const numSections = readU16(dv, peOffset + 6);
  const optHeaderSize = readU16(dv, peOffset + 20);
  const sectionTableOffset = peOffset + 24 + optHeaderSize;
  
  let rsrcRaw = 0;
  let rsrcVirt = 0;

  for (let i = 0; i < numSections; i++) {
    const sectionOffset = sectionTableOffset + (i * 40);
    const vAddr = readU32(dv, sectionOffset + 12);
    const vSize = readU32(dv, sectionOffset + 8);
    const rawPtr = readU32(dv, sectionOffset + 20);

    // Virtual Size can be 0 or small in some packed executables, sometimes SizeOfRawData is used.
    // We check if RVA falls within this section.
    if (rsrcRVA >= vAddr && rsrcRVA < vAddr + Math.max(vSize, readU32(dv, sectionOffset + 16))) {
      rsrcVirt = vAddr;
      rsrcRaw = rawPtr;
      break;
    }
  }

  if (rsrcRaw === 0) return [];

  const rvaToOffset = (rva: number) => {
      // Basic sanity check
      if (rva < rsrcVirt) return 0; 
      return rva - rsrcVirt + rsrcRaw;
  };
  
  const rsrcStart = rvaToOffset(rsrcRVA);
  if (rsrcStart <= 0 || rsrcStart >= dv.byteLength) return [];

  // Helper to walk directories
  const getDirEntries = (offset: number) => {
    if (offset + 16 > dv.byteLength) return [];
    const namedEntries = readU16(dv, offset + 12);
    const idEntries = readU16(dv, offset + 14);
    const entries = [];
    let current = offset + 16;
    for (let i = 0; i < namedEntries + idEntries; i++) {
      if (current + 8 > dv.byteLength) break;
      entries.push({
        id: readU32(dv, current),
        offset: readU32(dv, current + 4)
      });
      current += 8;
    }
    return entries;
  };

  const results: IconResource[] = [];
  
  // Root (Types)
  const rootEntries = getDirEntries(rsrcStart);
  const iconTypeEntry = rootEntries.find(e => e.id === 3); // RT_ICON = 3

  if (!iconTypeEntry) return [];
  if (!(iconTypeEntry.offset & 0x80000000)) return [];
  
  // Level 2 (IDs)
  const l2Offset = rsrcStart + (iconTypeEntry.offset & 0x7FFFFFFF);
  const iconIdEntries = getDirEntries(l2Offset);

  for (const iconEntry of iconIdEntries) {
    if (!(iconEntry.offset & 0x80000000)) continue;

    // Level 3 (Languages)
    const l3Offset = rsrcStart + (iconEntry.offset & 0x7FFFFFFF);
    const langEntries = getDirEntries(l3Offset);
    
    if (langEntries.length > 0) {
      const dataEntryOffset = rsrcStart + (langEntries[0].offset & 0x7FFFFFFF);
      if (dataEntryOffset + 8 > dv.byteLength) continue;

      const dataRVA = readU32(dv, dataEntryOffset);
      const size = readU32(dv, dataEntryOffset + 4);
      const fileOffset = rvaToOffset(dataRVA);

      if (fileOffset > 0 && fileOffset + size <= dv.byteLength) {
        processRawIconData(dv, fileOffset, size, results);
      }
    }
  }

  return results;
};

// --- NE Parsing (16-bit) ---

const parseNE = async (dv: DataView, neOffset: number): Promise<IconResource[]> => {
  // Resource Table Offset is at 0x24 relative to NE header
  const rsrcTabOffsetRel = readU16(dv, neOffset + 0x24);
  const rsrcTabOffset = neOffset + rsrcTabOffsetRel;

  if (rsrcTabOffset >= dv.byteLength) return [];

  const alignShift = readU16(dv, rsrcTabOffset);
  let currentTypeOffset = rsrcTabOffset + 2;
  const results: IconResource[] = [];

  // Loop through Resource Types
  while (currentTypeOffset < dv.byteLength) {
    const typeId = readU16(dv, currentTypeOffset);
    if (typeId === 0) break; // End of table

    const count = readU16(dv, currentTypeOffset + 2);
    // 4 bytes reserved
    
    // RT_ICON = 0x8003. (High bit set = integer id, 3 = icon)
    if (typeId === 0x8003) {
      let resourceOffset = currentTypeOffset + 8;
      for (let i = 0; i < count; i++) {
        // Resource Record: Offset(2), Length(2), Flags(2), ID(2), Handle(2), Usage(2)
        const offsetShifted = readU16(dv, resourceOffset);
        const lengthShifted = readU16(dv, resourceOffset + 2);
        
        // NE offsets are shifted by alignShift
        const fileOffset = offsetShifted << alignShift;
        const length = lengthShifted << alignShift;

        if (fileOffset > 0 && fileOffset + length <= dv.byteLength) {
            processRawIconData(dv, fileOffset, length, results);
        }
        resourceOffset += 12;
      }
      break; // Found icons, we can stop looking for types usually
    }

    // Skip to next type: 8 bytes header + (count * 12 bytes records)
    currentTypeOffset += 8 + (count * 12);
  }

  return results;
};


// --- Shared Processor ---

const processRawIconData = (dv: DataView, offset: number, size: number, results: IconResource[]) => {
    const iconData = new Uint8Array(dv.buffer, dv.byteOffset + offset, size);

    // Check PNG Signature
    if (iconData[0] === 0x89 && iconData[1] === 0x50 && iconData[2] === 0x4E && iconData[3] === 0x47) {
        const blob = new Blob([iconData], { type: 'image/png' });
        results.push({ url: URL.createObjectURL(blob), format: 'png' });
    } else {
        // Assume BMP/DIB, wrap in ICO
        const icoBuffer = createIcoFromRawBmp(iconData);
        if (icoBuffer) {
            const blob = new Blob([icoBuffer], { type: 'image/x-icon' });
            results.push({ url: URL.createObjectURL(blob), format: 'ico' });
        }
    }
};

const createIcoFromRawBmp = (data: Uint8Array): Uint8Array | null => {
  if (data.length < 40) return null;
  const dv = new DataView(data.buffer, data.byteOffset, data.length);
  
  // Sanity check BITMAPINFOHEADER
  const headerSize = dv.getUint32(0, true);
  if (headerSize !== 40) return null; 

  const width = dv.getInt32(4, true);
  const height = dv.getInt32(8, true) / 2; // Height is doubled in mask
  const planes = dv.getUint16(12, true);
  const bpp = dv.getUint16(14, true);
  const imageSize = data.length;

  const totalSize = 6 + 16 + imageSize;
  const buffer = new Uint8Array(totalSize);
  const outDv = new DataView(buffer.buffer);

  // ICO Header
  outDv.setUint16(0, 0, true); 
  outDv.setUint16(2, 1, true); // Type 1
  outDv.setUint16(4, 1, true); // Count 1

  // Entry
  buffer[6] = width >= 256 ? 0 : width;
  buffer[7] = height >= 256 ? 0 : height;
  buffer[8] = 0; 
  buffer[9] = 0;
  outDv.setUint16(10, planes, true);
  outDv.setUint16(12, bpp, true);
  outDv.setUint32(14, imageSize, true);
  outDv.setUint32(18, 22, true);

  buffer.set(data, 22);

  return buffer;
}


// --- Fallback Ripper ---
// Scans for PNG signatures and BMP headers in any binary file
export const ripImagesFromBinary = async (input: File | ArrayBuffer): Promise<IconResource[]> => {
  const arrayBuffer = input instanceof File ? await input.arrayBuffer() : input;
  const data = new Uint8Array(arrayBuffer);
  const dv = new DataView(arrayBuffer);
  const foundImages: IconResource[] = [];

  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  
  let i = 0;
  while (i < data.length - 16) {
    // 1. Check for PNG
    if (data[i] === 0x89 && data[i+1] === 0x50 && data[i+2] === 0x4E && data[i+3] === 0x47) { // Quick check
        let match = true;
        for (let j = 0; j < 8; j++) { if (data[i + j] !== pngSignature[j]) { match = false; break; } }
        
        if (match) {
            // Find IEND
            let offset = i + 8;
            let validPng = true;
            let endReal = 0;
            
            while (offset < data.length) {
                if (offset + 12 > data.length) { validPng = false; break; }
                const length = readU32(dv, offset); // Big Endian technically for PNG, but scanning relies on structure
                // Actually PNG is Big Endian, DataView default is Big Endian? No, getUint32(offset) is Big Endian by default? 
                // Wait, DataView needs endianness spec. PNG length is Big Endian.
                const lengthBE = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                
                // IEND check
                if (data[offset + 4] === 0x49 && data[offset + 5] === 0x45 && data[offset + 6] === 0x4E && data[offset + 7] === 0x44) {
                    endReal = offset + 12;
                    const blob = new Blob([data.slice(i, endReal)], { type: 'image/png' });
                    foundImages.push({ url: URL.createObjectURL(blob), format: 'png' });
                    i = endReal - 1;
                    break;
                }
                offset += 12 + lengthBE;
                if (offset > data.length) { validPng = false; break; }
            }
            if (validPng) { continue; }
        }
    }

    // 2. Check for BMP/DIB Header (Heuristic)
    // Structure: Size(4) Width(4) Height(4) Planes(2) BPP(2)
    // Size must be 40 (0x28) for standard Windows Icon DIBs
    if (data[i] === 0x28 && data[i+1] === 0x00 && data[i+2] === 0x00 && data[i+3] === 0x00) {
        // Heuristics to avoid false positives
        const w = readI32(dv, i + 4);
        const h = readI32(dv, i + 8);
        const planes = readU16(dv, i + 12);
        const bpp = readU16(dv, i + 14);
        const compression = readU32(dv, i + 16);

        // Valid icon dimensions usually < 512, planes must be 1, valid bpp
        if (w > 0 && w <= 512 && h > 0 && h <= 1024 && planes === 1 && 
           (bpp === 1 || bpp === 4 || bpp === 8 || bpp === 24 || bpp === 32) && compression === 0) {
             
             // Calculate expected size
             // Height for icons is often doubled (XOR + AND mask), but header usually says height * 2
             // The raw DIB data size calculation:
             const bppReal = bpp;
             const rowSize = Math.floor((bppReal * w + 31) / 32) * 4;
             // Height in DIB header for icons is usually the combined height, so we use `h`.
             const xorSize = rowSize * (h / 2); // Wait, if h is already doubled, this logic is tricky without knowing if it's icon or just bmp
             
             // Simplification: Standard DIB in file usually has image size or we calculate it.
             // We can just grab a reasonable chunk or try to parse `ImageSize` at offset 20
             let imgSize = readU32(dv, i + 20);
             if (imgSize === 0) {
                 // Estimate
                 imgSize = (w * h * bpp) / 8 + 4096; // Rough buffer
             }

             // We need to check if it's potentially valid.
             // Let's assume it is valid if we passed heuristics.
             // We cap size to avoid OOM on false positive
             const safeSize = Math.min(imgSize || 256*256*4, 500000); 
             
             if (i + safeSize <= data.length) {
                 const rawData = data.slice(i, i + safeSize + 40); // 40 for header + data
                 const ico = createIcoFromRawBmp(rawData);
                 if (ico) {
                     // High confidence?
                     const blob = new Blob([ico], { type: 'image/x-icon' });
                     foundImages.push({ url: URL.createObjectURL(blob), format: 'ico-rip' });
                     i += 40; // Advance past header at least
                     continue;
                 }
             }
        }
    }

    i++;
  }

  return foundImages;
};
