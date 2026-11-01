import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
const out=resolve(root,process.env.OUTPUT_DIR||'dist');
const languages=JSON.parse(await readFile(join(root,'languages.json'),'utf8')).filter(l=>l.enabled);
const supplied=process.env.SITE_URL?.trim();
let base='';
if(supplied){const parsed=new URL(supplied);if(parsed.protocol!=='https:')throw Error('SITE_URL must use HTTPS');base=parsed.href.replace(/\/?$/,'/');}
const template=await readFile(join(root,'source/template.html'),'utf8');
const scrollBootstrap=await readFile(join(root,'source/scroll-bootstrap.js'),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const absolute=path=>new URL(path,base).href;
await mkdir(out,{recursive:true});
await cp(join(root,'assets'),join(out,'assets'),{recursive:true});
await cp(join(root,'public'),out,{recursive:true});
const alternateTags=base?languages.map(l=>`<link rel="alternate" hreflang="${l.hreflang||l.code}" href="${absolute(l.code+'/')}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${base}">`:'';

for(const lang of languages){
  const t=JSON.parse(await readFile(join(root,'locales',lang.code+'.json'),'utf8'));
  const ru=JSON.parse(await readFile(join(root,'locales/ru.json'),'utf8'));
  for(const key of Object.keys(ru))if(typeof t[key]!=='string'||!t[key].trim())throw Error(`Missing ${lang.code}: ${key}`);
  let html=template.replace(/\{\{(t\d+)\}\}/g,(_,key)=>{if(!t[key])throw Error(`Missing ${key}`);return esc(t[key]);});
  html=html.replace('<html lang="ru">',`<html lang="${lang.hreflang||lang.code}" data-zone-label="${esc(t.t161.replace(/\s*1$/,''))}">`).replace('content="ru_RU"',`content="${lang.locale}"`);
  html=html.replaceAll('href="/styles.css"','href="/assets/styles.css"').replaceAll('src="/script.js"','src="/assets/script.js"').replaceAll('/assets/','../assets/');
  const links=languages.map(l=>`<a href="../${l.code}/index.html" lang="${l.hreflang||l.code}" hreflang="${l.hreflang||l.code}" data-language="${l.code}"${l.code===lang.code?' aria-current="page"':''}>${esc(l.name)}</a>`).join('');
  const languageLabel=lang.code==='ru'?'Выбрать язык':'Choose language';
  const globe='<svg class="language-globe" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15"/></svg>';
  const caret='<svg class="language-caret" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  html=html.replace('<a class="small-cta"',`<details class="language-switch"><summary aria-label="${languageLabel}: ${esc(lang.name)}">${globe}<span>${esc(lang.name)}</span>${caret}</summary><div class="language-options" role="group" aria-label="${languageLabel}">${links}</div></details>\n      <a class="small-cta"`);
  if(lang.code==='en')html=html.replace(/(mailto:pulsezones@proton.me)\?[^"\s]+/g,'$1?subject=PulseZones%20feedback');
  if(lang.code==='ru'){
    html=html.replace(/<a\b[^>]*href="https:\/\/(?:www\.)?threads\.com\/[^"\s]*"[^>]*>[\s\S]*?<\/a>/g,'').replaceAll(' · Threads: ','');
  }
  const app={
    '@context':'https://schema.org','@type':'MobileApplication',name:'PulseZones',operatingSystem:'Android',applicationCategory:'HealthApplication',
    description:t.t283,isAccessibleForFree:true,offers:{'@type':'Offer',price:0,priceCurrency:'USD'},
    downloadUrl:'https://play.google.com/store/apps/details?id=com.pulsezones.pulselock',
    inLanguage:['ru','en','es','pt-BR','de','fr','it','pl','tr','ka'],
    featureList:[t.t023,t.t025,t.t027,t.t029]
  };
  if(base){app.url=absolute(lang.code+'/');app.image=absolute('assets/pulsezones-icon.png');}
  const metadata=(base?`<link rel="canonical" href="${absolute(lang.code+'/')}">\n${alternateTags}\n<meta property="og:url" content="${absolute(lang.code+'/')}">\n<meta property="og:image" content="${absolute('assets/og-image.png')}">\n`:'')+`<script type="application/ld+json">${JSON.stringify(app).replaceAll('<','\\u003c')}</script>`;
  html=html.replace('</head>',metadata+'\n</head>');
  html=html.replace('<head>',`<head><style>html[data-scroll-restore]{visibility:hidden;scroll-behavior:auto!important}</style><script>${scrollBootstrap}</script>`);
  await mkdir(join(out,lang.code),{recursive:true});
  await writeFile(join(out,lang.code,'index.html'),html);
}

const chooser=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PulseZones — Choose your language / Выберите язык</title><meta name="description" content="PulseZones: free Android app for chest strap heart rate monitors. Choose English or Russian."><link rel="stylesheet" href="assets/styles.css"><link rel="icon" href="assets/pulsezones-icon.png">${base?`<link rel="canonical" href="${base}">${alternateTags}`:''}</head><body><main class="language-home"><img src="assets/pulsezones-icon.png" alt="PulseZones" width="80" height="80"><h1>PulseZones</h1><p>Choose your language<br><span lang="ru">Выберите язык</span></p><nav aria-label="Choose your language">${languages.map(l=>`<a class="button ${l.code==='en'?'primary':'ghost'}" href="${l.code}/index.html" lang="${l.hreflang||l.code}" hreflang="${l.hreflang||l.code}">${esc(l.name)}</a>`).join('')}</nav></main></body></html>`;
await writeFile(join(out,'index.html'),chooser);
await writeFile(join(out,'.nojekyll'),'');
const urls=['',...languages.map(l=>l.code+'/')];
if(base){
  await writeFile(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(p=>`<url><loc>${esc(absolute(p))}</loc></url>`).join('')}</urlset>\n`);
  await writeFile(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
}else{
  await writeFile(join(out,'robots.txt'),'User-agent: *\nAllow: /\n');
  console.log('Local preview: canonical, hreflang and sitemap require SITE_URL. GitHub Actions sets it automatically.');
}
console.log(`Built ${languages.map(l=>l.code).join(', ')} in ${out}`);
