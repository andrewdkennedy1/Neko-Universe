// Accessing public repo content
const REPO_OWNER = 'eliot-akira';
const REPO_NAME = 'neko';
const BRANCH = 'main';

const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

export interface GithubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string;
}

export const fetch1997LibraryList = async (): Promise<GithubFile[]> => {
  try {
    const response = await fetch(`${API_BASE}/1997-icon-libraries`);
    if (!response.ok) throw new Error('Failed to fetch library list');
    const data = await response.json();
    return data.filter((f: GithubFile) => f.name.toLowerCase().endsWith('.icl') || f.name.toLowerCase().endsWith('.dll'));
  } catch (e) {
    console.error("GitHub API limit or error", e);
    return [];
  }
};

export const fetch2023VariantList = async (): Promise<GithubFile[]> => {
  try {
    const response = await fetch(`${API_BASE}/2023-icon-library`);
    if (!response.ok) throw new Error('Failed to fetch variant list');
    const data = await response.json();
    return data.filter((f: GithubFile) => f.type === 'dir');
  } catch (e) {
    console.error("GitHub API limit or error", e);
    return [];
  }
};

export const fetchRawFile = async (path: string): Promise<Blob> => {
  const response = await fetch(`${RAW_BASE}/${path}`);
  if (!response.ok) throw new Error('Failed to download file');
  return await response.blob();
};

// Generates the sprite map URLs without hitting the API for every single image
export const constructNekoSkin = (folderName: string): Record<string, string> => {
  const baseUrl = `${RAW_BASE}/2023-icon-library/${folderName}`;
  const sprites: Record<string, string> = {};
  
  const keys = [
    'alert', 'still', 'yawn', 'wash', 'itch1', 'itch2',
    'sleep1', 'sleep2',
    'nrun1', 'nrun2', 'nerun1', 'nerun2', 'erun1', 'erun2', 
    'serun1', 'serun2', 'srun1', 'srun2', 'swrun1', 'swrun2', 
    'wrun1', 'wrun2', 'nwrun1', 'nwrun2',
    'nscratch1', 'nscratch2', 'escratch1', 'escratch2', 
    'wscratch1', 'wscratch2', 'sscratch1', 'sscratch2'
  ];

  keys.forEach(key => {
    sprites[key] = `${baseUrl}/${key}.png`;
  });

  return sprites;
};

// Updated Mapping based on User Feedback (0 = Still, 1 = North Start)
export const ICL_INDEX_MAP: Record<string, number> = {
    // State 0
    still: 0,
    
    // Movement (1-16)
    nrun1: 1, nrun2: 2,
    nerun1: 3, nerun2: 4,
    erun1: 5, erun2: 6,
    serun1: 7, serun2: 8,
    srun1: 9, srun2: 10,
    swrun1: 11, swrun2: 12,
    wrun1: 13, wrun2: 14,
    nwrun1: 15, nwrun2: 16,

    // Wall Scratches (17-24)
    nscratch1: 17, nscratch2: 18,
    escratch1: 19, escratch2: 20,
    sscratch1: 21, sscratch2: 22,
    wscratch1: 23, wscratch2: 24,

    // Misc States (25-31)
    yawn: 25,
    sleep1: 26, sleep2: 27,
    itch1: 28, itch2: 29,
    alert: 30,
    wash: 31, 
};

// Maps the 32 icons from a legacy ICL to the standard keys
export const mapIclIconsToSkin = (iconUrls: string[]): Record<string, string> => {
    const get = (idx: number) => iconUrls[idx] || iconUrls[0];
    const map: Record<string, string> = {};
    
    for (const [key, idx] of Object.entries(ICL_INDEX_MAP)) {
        map[key] = get(idx);
    }
    return map;
};
