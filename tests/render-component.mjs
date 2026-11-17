import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import ts from 'typescript';

// Execute the actual TSX in SSR tests; CSS is checked in the browser.
export async function loadComponent(url){
 let source=await readFile(url,'utf8');
 source=source.replace(/^import ['"][^'"]+\.css['"];?\s*$/gm,'');
 let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const paths=[...js.matchAll(/from ["']([^"']+)["']/g)].map(m=>m[1]),resolved=new Map();
 for(const path of paths){
  if(!path.startsWith('.'))resolved.set(path,import.meta.resolve(path));
  else{
   const tsx=new URL(path+'.tsx',url),target=existsSync(tsx)?tsx:new URL(path+'.ts',url);
   resolved.set(path,target.pathname.endsWith('.tsx')?await componentUrl(target):target.href);
  }
 }
 js=js.replace(/from ["']([^"']+)["']/g,(_all,path)=>'from '+JSON.stringify(resolved.get(path)));
 return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
}
async function componentUrl(url){return loadComponent(url);}
