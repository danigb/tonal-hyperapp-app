!function(){"use strict";function n(n,r){var o,a=arguments,i=[];for(e=arguments.length;e-- >2;)t.push(a[e]);for(;t.length;)if(Array.isArray(o=t.pop()))for(e=o.length;e--;)t.push(o[e]);else null!=o&&!0!==o&&!1!==o&&("number"==typeof o&&(o+=""),i.push(o));return"string"==typeof n?{tag:n,data:r||{},children:i}:n(r,i)}var e,t=[],r=[];!function(n){function e(n,t,r){Object.keys(t||[]).map(function(o){var u=t[o],f=r?r+"."+o:o;"function"==typeof u?n[o]=function(n){i("action",{name:f,data:n});var e=i("resolve",u(p,b,n));return"function"==typeof e?e(a):a(e)}:e(n[o]||(n[o]={}),u,f)})}function t(n){for(h=v(A,h,g,g=i("render",m)(p,b),y=!y);n=r.pop();)n()}function o(){m&&!y&&requestAnimationFrame(t,y=!y)}function a(n){return"function"==typeof n?a(n(p)):(n&&(n=i("update",u(p,n)))&&o(p=n),p)}function i(n,e){return(k[n]||[]).map(function(n){var t=n(p,b,e);null!=t&&(e=t)}),e}function u(n,e){var t={};for(var r in n)t[r]=n[r];for(var r in e)t[r]=e[r];return t}function f(n){if(n&&(n=n.data))return n.key}function c(n,e){if("string"==typeof n)t=document.createTextNode(n);else{var t=(e=e||"svg"===n.tag)?document.createElementNS("http://www.w3.org/2000/svg",n.tag):document.createElement(n.tag);n.data&&n.data.oncreate&&r.push(function(){n.data.oncreate(t)});for(var o in n.data)l(t,o,n.data[o]);for(o=0;o<n.children.length;)t.appendChild(c(n.children[o++],e))}return t}function l(n,e,t,r){if("key"===e);else if("style"===e)for(var o in u(r,t=t||{}))n.style[o]=t[o]||"";else{try{n[e]=t}catch(n){}"function"!=typeof t&&(t?n.setAttribute(e,t):n.removeAttribute(e))}}function d(n,e,t){for(var o in u(e,t)){var a=t[o],i="value"===o||"checked"===o?n[o]:e[o];a!==i&&l(n,o,a,i)}t&&t.onupdate&&r.push(function(){t.onupdate(n,e)})}function s(n,e,t){t&&t.onremove?t.onremove(e):n.removeChild(e)}function v(n,e,t,r,o,a){if(null==t)e=n.insertBefore(c(r,o),e);else if(null!=r.tag&&r.tag===t.tag){d(e,t.data,r.data),o=o||"svg"===r.tag;for(var i=r.children.length,u=t.children.length,l={},p=[],h={},g=0;g<u;g++)m=p[g]=e.childNodes[g],null!=(B=f(b=t.children[g]))&&(l[B]=[m,b]);for(var g=0,y=0;y<i;){var m=p[g],b=t.children[g],k=r.children[y];if(h[B=f(b)])g++;else{var w=f(k),A=l[w]||[];null==w?(null==B&&(v(e,m,b,k,o),y++),g++):(B===w?(v(e,A[0],A[1],k,o),g++):A[0]?(e.insertBefore(A[0],m),v(e,A[0],A[1],k,o)):v(e,m,null,k,o),y++,h[w]=k)}}for(;g<u;){var B=f(b=t.children[g]);null==B&&s(e,p[g],b.data),g++}for(var g in l){var N=(A=l[g])[1];h[N.data.key]||s(e,A[0],N.data)}}else e&&r!==e.nodeValue&&("string"==typeof r&&"string"==typeof t?e.nodeValue=r:(e=n.insertBefore(c(r,o),a=e),s(n,a,t.data)));return e}var p,h,g,y,m=n.view,b={},k={},w=n.mixins||[],A=n.root||document.body;w.concat(n).map(function(n){n="function"==typeof n?n(i):n,Object.keys(n.events||[]).map(function(e){k[e]=(k[e]||[]).concat(n.events[e])}),p=u(p,n.state),e(b,n.actions)}),o((g=i("load",h=A.children[0]))===h&&(g=h=null))}({model:"Hi.",view:function(e){return n("h1",null,e)}})}();
