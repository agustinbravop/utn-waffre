import fsp from "fs/promises";
import fs from "fs";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { resolve, normalize } from "path";
import { debugPlugin, wikiLinkPlugin } from "./wikilinks/remark-plugin";
import rehypeMermaid from "rehype-mermaidjs";

/**
 * Lee los archivos de la _Vault_ de Obsidian y los parsea a HTML que Astro puede compilar.
 */
export function parseVault(path: string) {
  /*
  getFilePaths
  getImagePaths

  for path in filePaths {
    transform(path)
  }

  for path in imagePaths {
    copyPaste(path)
  }
  */
}

function isDirectorySync(path: string) {
  const stat = fs.statSync(path);
  return stat.isDirectory();
}

/**
 * Retorna un arreglo con los paths absolutos de todos los archivos dentro del directorio.
 * Busca recursivamente en sus subdirectorios.
 */
function getAllFiles(path: string) {
  if (shouldIgnorePath(path)) {
    return [];
  }

  if (isDirectorySync(path)) {
    let ans: string[] = [];
    for (const subpath of fs.readdirSync(path)) {
      ans = ans.concat(getAllFiles(resolve(path, subpath)));
    }
    return ans;
  }

  return [path];
}

/**
 * Vuelve URL-compatible a un string. Reemplaza los espacios por '-'
 * y transforma las letras mayúsculas o acentuadas.
 *
 * Ej: de 'Ingeniería Química' a 'ingenieria-quimica'.
 */
function slugify(text: string) {
  return text
    .normalize("NFKD") // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
    .toLowerCase() // Convert the string to lowercase letters
    .trim() // Remove whitespace from both sides of a string (optional)
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w^/^\\^#\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

const IGNORED_PATHS = [
  resolve("waffre/.obsidian"),
  resolve("waffre/Excalidraw"),
];

const VAULT_ROOT = "waffre";

function shouldIgnorePath(path: string) {
  return IGNORED_PATHS.includes(path) || path.endsWith("assets");
}

/**
 * Transforma un filePath absoluto de un archivo .md de Obsidian
 * al link que usaría montado en el sitio web.
 */
function urlifyAbsolutePath(path: string) {
  // Tomar path relativo desde la carpeta 'waffre/'.
  const relativePath = normalize(path).split(normalize("/waffre"))[1];
  // Eliminar subcarpeta 'nivel-{1|2|3|4|5}' y eliminar extensión '.md'.
  const relativeUrl = relativePath.replace(/nivel\-\d[\\/]+/, "").slice(0, -3);
  // Link montado en sección '/wiki' del sitio web.
  return "/wiki" + slugify(relativeUrl).replaceAll("\\", "/");
}

/**
 * Obtiene los filePaths de todos los archivos .md en el Vault de Obsidian.
 */
let mapFilesToUrls: Record<string, string> = getAllFiles(VAULT_ROOT).reduce(
  (map: Record<string, string>, file) => {
    map[file] = urlifyAbsolutePath(file);
    return map;
  },
  {}
);

function getVaultFiles() {
  return Object.keys(mapFilesToUrls);
}

/**
 * Obtiene las urls del sitio web correspondientes a cada archivo .md en el Vault de Obsidian.
 */
function getVaultUrls() {
  return Object.values(mapFilesToUrls);
}

/**
 * Busca la url del sitio web correspondiente a un wikilink de Obsidian.
 * Genera una url aunque no encuentre el archivo referenciado.
 *
 * Ej: El wikilink [[Funciones Administrativas]] va al archivo
 * 'waffre/isi/nivel-1/sistemas-y-organizaciones/Funciones Administrativas.md'
 * que tiene la url '/wiki/isi/sistemas-y-organizaciones/funciones-administrativas'.
 *
 * Si existen dos archivos llamados 'Plafinicación.md' en distintas carpetas,
 * el wikilink de Obsidian sería [[isi/nivel-1/planificacion/Planificación]].
 */
function resolveWikilinkUrl(wikilink: string) {
  const allFiles = getVaultFiles();

  // Cualquier anchor (Ej: #titulo-2) es válido.
  const [link, anchor] = wikilink.split("#");
  const file = allFiles.find((filePath) => filePath.includes(link));
  if (!file) {
    // La página no existe. El sitio web dirigirá a un 404.
    return slugify(wikilink);
  }

  return `${mapFilesToUrls[file]}#${anchor}`;
}

async function parseMarkdownFile(path: string) {
  const obsidianMd = await fsp.readFile(path);

  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(remarkGfm)
    .use(wikiLinkPlugin, {
      permalinks: getVaultUrls(),
      hrefTemplate: (l: string) => l,
      pageResolver: (l: string) => [resolveWikilinkUrl(l)],
    })
    .use(remarkFrontmatter)
    .use(rehypeMermaid)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings)
    .use(rehypeStringify)
    .use(debugPlugin)
    .process(obsidianMd);

  console.dir(result, { depth: null });
}

parseMarkdownFile("src/scripts/Administración.md");
