const m=document.getElementById('menu'),l=document.getElementById('links');m.onclick=()=>l.classList.toggle('open');l.querySelectorAll('a').forEach(a=>a.onclick=()=>l.classList.remove('open'));
