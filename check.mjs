import {readFile,access} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const out=resolve(root,process.env.OUTPUT_DIR||'dist');
const languages=JSON.parse(await readFile(join(root,'languages.json'),'utf8')).filter(l=>l.enabled);
const errors=[];
const reference=JSON.parse(await readFile(join(root,'locales/ru.json'),'utf8'));
for(const lang of languages){
  const translation=JSON.parse(await readFile(join(root,'locales',lang.code+'.json'),'utf8'));
  if(Object.keys(translation).sort().join()!==Object.keys(reference).sort().join())errors.push(`${lang.code}: translation keys differ`);
  for(const key of Object.keys(reference))if(typeof translation[key]!=='string'||!translation[key].trim())errors.push(`${lang.code}: missing translation ${key}`);
  const path=join(out,lang.code,'index.html');
  const html=await readFile(path,'utf8');
  if(html.includes('{{t'))errors.push(`${lang.code}: untranslated token`);
  if((html.match(/<h1\b/g)||[]).length!==1)errors.push(`${lang.code}: H1 count`);
  if(!html.includes(`<html lang="${lang.hreflang||lang.code}"`))errors.push(`${lang.code}: HTML language`);
  if(!html.includes(`content="${lang.locale}"`))errors.push(`${lang.code}: Open Graph locale`);
  if((html.match(/<meta property="og:image"/g)||[]).length!==Number(Boolean(process.env.SITE_URL)))errors.push(`${lang.code}: duplicate or unexpected Open Graph image`);
  if(!html.includes(`<title>${translation.t001}</title>`))errors.push(`${lang.code}: localized title`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length)errors.push(`${lang.code}: duplicate IDs`);
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const value=m[1];
    if(value.startsWith('#')){if(!ids.includes(value.slice(1)))errors.push(`${lang.code}: broken anchor ${value}`);continue;}
    if(/^(https?:|mailto:|data:)/.test(value))continue;
    if(value.startsWith('/')){errors.push(`${lang.code}: root-relative path ${value}`);continue;}
    try{await access(resolve(dirname(path),value.split('#')[0]));}catch{errors.push(`${lang.code}: missing ${value}`);}
  }
  for(const m of html.matchAll(/srcset="([^"]+)"/g))for(const candidate of m[1].split(',')){
    try{await access(resolve(dirname(path),candidate.trim().split(/\s+/)[0]));}catch{errors.push(`${lang.code}: missing srcset image`);}
  }
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
  if(lang.code==='en'){
    const visible=html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'').replaceAll('Русский','');
    if(/[А-Яа-яЁё]/.test(visible))errors.push('en: Russian text remaining');
  }
  for(const other of languages)if(!html.includes(`data-language="${other.code}"`))errors.push(`${lang.code}: missing switch ${other.code}`);
  if(process.env.SITE_URL){
    const base=process.env.SITE_URL.replace(/\/?$/,'/');
    if(!html.includes(`rel="canonical" href="${base}${lang.code}/"`))errors.push(`${lang.code}: canonical`);
    for(const other of languages)if(!html.includes(`hreflang="${other.hreflang||other.code}" href="${base}${other.code}/"`))errors.push(`${lang.code}: hreflang ${other.code}`);
    if(!html.includes(`hreflang="x-default" href="${base}"`))errors.push(`${lang.code}: x-default`);
    if(!html.includes(`property="og:image" content="${base}assets/og-image.png"`))errors.push(`${lang.code}: Open Graph image URL`);
  }
}
if(process.env.SITE_URL){
  const sitemap=await readFile(join(out,'sitemap.xml'),'utf8');
  for(const lang of languages)if(!sitemap.includes(`/${lang.code}/</loc>`))errors.push(`sitemap missing ${lang.code}`);
}
if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: translations, language links, local assets, anchors, JSON-LD'+(process.env.SITE_URL?', canonical, hreflang and sitemap':''));
