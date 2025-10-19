// ...new file...
async function includeFragments() {
  const els = document.querySelectorAll('[data-include]');
  for (const el of els) {
    const url = el.getAttribute('data-include');
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      // base for resolving relative URLs inside the fragment
      const base = new URL(url, location.href);

      // insert fragment HTML
      el.innerHTML = html;

      // move <link rel="stylesheet"> to head (resolve relative hrefs)
      const links = Array.from(el.querySelectorAll('link[rel="stylesheet"]'));
      for (const l of links) {
        const href = l.getAttribute('href') || '';
        const absHref = new URL(href, base).href;
        // avoid duplicate insertion
        if (!document.querySelector(`link[rel="stylesheet"][href="${absHref}"]`)) {
          const nl = document.createElement('link');
          nl.rel = 'stylesheet';
          nl.href = absHref;
          if (l.media) nl.media = l.media;
          document.head.appendChild(nl);
        }
        l.remove();
      }

      // move inline <style> to head
      const styles = Array.from(el.querySelectorAll('style'));
      for (const s of styles) {
        const ns = document.createElement('style');
        ns.textContent = s.textContent;
        document.head.appendChild(ns);
        s.remove();
      }

      // execute scripts in fragment (resolve relative src)
      const scripts = Array.from(el.querySelectorAll('script'));
      for (const old of scripts) {
        const s = document.createElement('script');
        if (old.src) {
          s.src = new URL(old.src, base).href;
          if (old.type) s.type = old.type;
          document.head.appendChild(s); // load external script
        } else {
          s.textContent = old.textContent; // inline script
          document.head.appendChild(s);
          document.head.removeChild(s);
        }
        old.remove();
      }
    } catch (err) {
      console.error('includeFragments error loading', url, err);
      el.innerHTML = `<!-- failed to include ${url} -->`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', includeFragments);
} else {
  includeFragments();
}

window.includeFragments = includeFragments;