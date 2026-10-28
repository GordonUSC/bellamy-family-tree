/* Bellamy family tree: progressive enhancement over the static page. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var D;
  try { D = JSON.parse($("data").textContent); } catch (err) { return; }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DUR = reduce ? 0 : 450;
  var ORD = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"];

  var byId = {}, kids = {};
  D.people.forEach(function (p) { byId[p.id] = p; (kids[p.parent || "root"] = kids[p.parent || "root"] || []).push(p.id); });
  function label(p) {
    if (!p) return "";
    if (p.unknown) return "a name still to be found";
    return p.n + (p.sp ? " & " + p.sp : "") + (p.partners ? ", with " + p.partners.map(function (q) { return q.n; }).join(" and ") : "");
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lineage(id) {
    var out = [], p = byId[id];
    while (p) { out.unshift(p); p = byId[p.parent]; }
    return out;
  }

  /* ---------- the person card ---------- */
  var card = $("card"), cardbody = $("cardbody"), lastFocus = null;
  function openCard(htmlStr) {
    lastFocus = document.activeElement;
    cardbody.innerHTML = htmlStr.replace(/\.\.<\/p>/g, ".</p>");   // "Werten Jr." + "." reads once
    card.hidden = false;
    card.focus({ preventScroll: true });
  }
  function closeCard() { card.hidden = true; if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); }
  $("cardx").addEventListener("click", closeCard);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !card.hidden) closeCard(); });

  /* a partner Gordon added (no entry of their own in the book): a card of their own */
  function partnerCard(pid, i) {
    var p = byId[pid], q = p && p.partners && p.partners[i];
    if (!q) return;
    var h = '<h3 id="card-h">' + esc(q.n) + "</h3><p>" + esc(p.n) + "'s " + esc(q.rel) + ".</p><p>Added by " + esc(q.added) + ".</p>";
    var theirs = (kids[pid] || []).map(function (k) { return byId[k]; }).filter(function (c) { return c.mother === q.n; });
    h += '<ul><li><button type="button" class="go" data-go="' + pid + '">' + esc(p.n) + "</button></li>" +
      theirs.map(function (c) { return '<li><button type="button" class="go" data-go="' + c.id + '">' + esc(c.n) + (c.step ? ", her son" : ", her child") + "</button></li>"; }).join("") + "</ul>";
    h += '<p class="path"><a href="#page-' + p.page + '">' + esc(p.n) + " in the family book, page " + p.page + "</a></p>";
    openCard(h);
  }
  /* first names repeat, so a search that finds several people asks which one */
  function chooserCard(v, hits) {
    var h = '<h3 id="card-h">' + hits.length + " people named " + esc(v) + "</h3><p>Which one do you mean?</p><ul>" +
      hits.map(function (m) { return '<li><button type="button" class="go" ' + (m.partner != null ? 'data-partner="' + m.id + ":" + m.partner + '"' : 'data-go="' + m.id + '"') + ">" + esc(m.label) + "</button></li>"; }).join("") + "</ul>";
    openCard(h);
  }
  function searchHits(v) {
    var lv = v.toLowerCase(), out = [];
    function test(n, exact) { n = (n || "").toLowerCase(); return exact ? n === lv : n.indexOf(lv) === 0; }
    [true, false].some(function (exact) {
      D.people.forEach(function (p) {
        if (p.unknown) return;
        var par = byId[p.parent];
        if (test(p.n, exact)) out.push({ id: p.id, label: p.n + (par ? (p.step ? ", stepson of " + par.n : ", child of " + (p.mother ? par.n + " and " + p.mother : label(par))) : (p.sp ? " & " + p.sp : "")) });
        if (p.sp && test(p.sp, exact)) out.push({ id: p.id, label: p.sp + ", " + (p.sp_added ? "husband" : "partner") + " of " + p.n });
        (p.partners || []).forEach(function (q, i) { if (test(q.n, exact)) out.push({ id: p.id, partner: i, label: q.n + ", " + p.n + "'s " + q.rel }); });
      });
      return out.length > 0;
    });
    return out;
  }

  function personCard(id) {
    var p = byId[id];
    if (!p) return;
    var h = "";
    if (p.unknown) {
      var par = byId[p.parent];
      h += '<h3 id="card-h">A name still to be found</h3><p>The book lists ' + esc(label(par)) + "'s children as Unknown.</p>";
      h += "<p>Names like these are why the family keeps gathering. If you know, <a href=\"#add\">add it</a>.</p>";
    } else {
      h += '<h3 id="card-h">' + esc(p.n) + "</h3>";
      if (p.gen === 1) h += "<p>The founding household, as the book lists it.</p>";
      else h += "<p>" + ORD[p.gen] + " generation" + (p.d ? ", in memory" : "") + (p.adopted ? ", adopted into the family" : "") + ".</p>";
      if (p.sp) h += "<p>With " + esc(p.sp) + (p.spd ? " (in memory)" : "") + (p.sp_added ? ", his husband (added by Gordon, 2026)" : "") + ".</p>";
      if (p.partners) p.partners.forEach(function (q) { h += "<p>With " + esc(q.n) + ", " + esc(q.rel) + " (added by " + esc(q.added) + ").</p>"; });
      if (p.step) h += "<p>" + esc(p.mother) + "'s son, and Werten Jr.'s stepson: family by marriage, welcomed in.</p>";
      else if (p.mother) h += "<p>Mother: " + esc(p.mother) + " (added by Gordon, 2026).</p>";
      if (p.added) h += "<p>Added by " + esc(p.added) + ".</p>";
      if (p.named_by) h += "<p>Name from " + esc(p.named_by) + ".</p>";
      var par2 = byId[p.parent];
      if (par2) {
        var hh = lineage(id)[0];
        if (p.step) h += "<p>Stepson of " + esc(par2.n) + ".</p>";
        else if (p.mother) h += "<p>Child of " + esc(par2.n) + " and " + esc(p.mother) + ".</p>";
        else h += "<p>Child of " + esc(par2.gen === 1 ? "Reverend Samuel & " + par2.sp : label(par2)) + ".</p>";
        var path = lineage(id).slice(1).map(function (x) { return esc(x.n); });
        path.unshift("Reverend Samuel & " + esc(hh.sp));
        h += '<p class="path">' + path.join(" &rarr; ") + "</p>";
      }
      var ch = (kids[id] || []).map(function (k) { return byId[k]; });
      var named = ch.filter(function (c) { return !c.unknown; });
      if (named.length) {
        h += "<p>" + (named.some(function (c) { return c.added; }) ? "Children:" : "Children in the book:") + "</p><ul>" + named.map(function (c) { return '<li><button type="button" class="go" data-go="' + c.id + '">' + esc(label(c)) + "</button></li>"; }).join("") + "</ul>";
      } else if (ch.length) h += "<p>The book lists their children as Unknown, still to be found.</p>";
      if (p.anchor === "gordon") h += '<p>And his chosen family: <a href="#chosen">the family we choose</a>.</p>';
      if (p.note) h += '<p class="path">Reading note: ' + esc(p.note) + "</p>";
    }
    h += '<p class="path"><a href="#page-' + p.page + '">Family book, page ' + p.page + "</a></p>";
    openCard(h);
  }
  cardbody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (b) { reveal(b.getAttribute("data-go"), true); }
    var pb = e.target.closest("[data-partner]");
    if (pb) { var pp = pb.getAttribute("data-partner").split(":"); reveal(pp[0], false); partnerCard(pp[0], +pp[1]); }
    var a = e.target.closest('a[href^="#page-"]');
    if (a) { var det = document.querySelector("details.pages"); if (det) det.open = true; closeCard(); }
  });

  /* chosen family */
  var cfButtons = document.querySelectorAll(".cf");
  cfButtons.forEach(function (b, i) {
    b.parentNode.style.setProperty("--a", (i * 360 / cfButtons.length) + "deg");
    b.addEventListener("click", function () {
      var c = D.chosen.people[+b.getAttribute("data-cf")];
      openCard('<h3 id="card-h">' + esc(c.n) + "</h3><p>" + esc(c.rel) + ".</p><p>In the family we choose, beside Gordon. Chosen family is family.</p>");
    });
  });

  /* page index -> tree */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-page]");
    if (!b) return;
    var pg = D.pages.filter(function (x) { return x.page === +b.getAttribute("data-page"); })[0];
    if (pg && pg.people.length) { showOnTree(pg.people); }
  });

  /* ---------- narration + ambient ---------- */
  var narr = $("narration"), play = $("play"), cap = $("cap");
  if (narr && play) {
    play.addEventListener("click", function () {
      if (narr.paused) { narr.play(); } else { narr.pause(); }
    });
    narr.addEventListener("play", function () { play.setAttribute("aria-pressed", "true"); play.querySelector("span").textContent = "Pause"; });
    narr.addEventListener("pause", function () { play.setAttribute("aria-pressed", "false"); play.querySelector("span").textContent = "Hear the welcome"; });
    narr.addEventListener("ended", function () { cap.textContent = ""; });
    var tr = narr.textTracks && narr.textTracks[0];
    if (tr) {
      tr.mode = "hidden";
      tr.addEventListener("cuechange", function () {
        var c = tr.activeCues && tr.activeCues[0];
        cap.textContent = c ? c.text : "";
      });
    }
  }
  var amb = $("ambient"), ambBtn = $("amb");
  if (amb && ambBtn) {
    amb.volume = 0.25;
    ambBtn.addEventListener("click", function () {
      if (amb.paused) { amb.play(); ambBtn.setAttribute("aria-pressed", "true"); ambBtn.textContent = "Stop the music"; }
      else { amb.pause(); ambBtn.setAttribute("aria-pressed", "false"); ambBtn.textContent = "Play quiet music"; }
    });
  }

  /* ---------- contribution form: local only ---------- */
  var form = $("contrib");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = $("c-body").value.trim();
    if (!body) { $("c-status").textContent = "Please write a memory, a name or a correction first."; return; }
    var text = ["For the Bellamy family book", "From: " + $("c-who").value.trim(), "Book page: " + $("c-page").value.trim(), "", body, "",
      "Made on the family tree page. Nothing was sent or stored. Share it privately with the family when you choose."].join("\n");
    var url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    var a = document.createElement("a"); a.href = url; a.download = "bellamy-family-note.txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
    $("c-status").textContent = "Your file is ready. Nothing was sent anywhere.";
  });

  /* ---------- opt-in chime ---------- */
  var chimeOn = false, sfx = $("sfx-branch"), chBtn = $("chimes");
  function chime() { if (chimeOn && sfx) { try { sfx.currentTime = 0; sfx.volume = 0.5; sfx.play(); } catch (e) {} } }
  if (chBtn) chBtn.addEventListener("click", function () {
    chimeOn = !chimeOn; chBtn.setAttribute("aria-pressed", String(chimeOn)); chBtn.textContent = chimeOn ? "Chimes on" : "Chimes off";
    if (chimeOn) chime();
  });

  /* ---------- looping clips: only when motion is welcome, only while visible ---------- */
  function startLoops() {
    if (reduce) return;
    var vids = [].slice.call(document.querySelectorAll("video.loopvid"));
    var narrow = window.matchMedia("(max-width: 700px)").matches;
    function arm(v) {
      if (v.src) return;
      v.src = (narrow && v.getAttribute("data-narrow")) || v.getAttribute("data-src");
      v.muted = true;
      v.addEventListener("playing", function () { v.classList.add("on"); });
    }
    function playIt(v) { arm(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if (!("IntersectionObserver" in window)) { vids.forEach(playIt); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) playIt(e.target); else if (e.target.src) e.target.pause(); });
    }, { rootMargin: "120px" });
    vids.forEach(function (v) { io.observe(v); });
  }
  try { startLoops(); } catch (e) {}

  /* ---------- the tree ---------- */
  var reveal = function () {}, showOnTree = function () {};
  function startTree() {
    if (!window.d3) return;               // CDN blocked: the list stays, which is the whole tree
    doc.classList.add("js");
    var viz = $("viz"), list = $("list"), tools = document.querySelector(".tools");
    viz.hidden = false; tools.hidden = false; $("hint").hidden = false; list.hidden = true;

    function build(id) {
      var p = byId[id];
      var node = { id: id, p: p };
      var ch = (kids[id] || []).map(build);
      if (ch.length) node.children = ch;
      return node;
    }
    var rootData = { id: "root", p: { n: "Reverend Samuel", gen: 0 }, children: (kids.root || []).map(build) };
    var root = d3.hierarchy(rootData);
    root.x0 = 0; root.y0 = 0;
    var index = {};
    root.descendants().forEach(function (d) { d._id = d.data.id; index[d._id] = d; });
    root.descendants().forEach(function (d) {
      if (d.depth >= 2 && d.children) { d._children = d.children; d.children = null; }
    });

    var layout = d3.tree().nodeSize([24, 210]).separation(function (a, b) { return a.parent === b.parent ? 1 : 1.3; });
    var svg = d3.select(viz).append("svg").attr("aria-hidden", null);
    var g = svg.append("g");
    var gl = g.append("g"), gn = g.append("g");
    var zoom = d3.zoom().scaleExtent([0.12, 3]).on("zoom", function (ev) { g.attr("transform", ev.transform); });
    svg.call(zoom).on("dblclick.zoom", null);

    function nodeName(d) {
      if (d._id === "root") return "Reverend Samuel";
      var p = d.data.p;
      if (p.gen === 1) return "with " + p.sp;
      return label(p);
    }
    function curve(s, t) {
      // a vine: horizontal S-curve with a small curl near the parent
      var mx = (s.y + t.y) / 2;
      return "M" + s.y + "," + s.x + "C" + mx + "," + s.x + " " + mx + "," + t.x + " " + t.y + "," + t.x;
    }
    var hit = {}, thread = {};
    function setThread(id) { thread = {}; var d = index[id]; while (d) { thread[d._id] = true; d = d.parent; } }
    function update(src) {
      layout(root);
      if (src.x0 == null) { src.x0 = src.x; src.y0 = src.y; }
      var nodes = root.descendants(), links = root.links();
      var t = svg.transition().duration(DUR);
      var node = gn.selectAll("g.node").data(nodes, function (d) { return d._id; });
      var enter = node.enter().append("g")
        .attr("transform", "translate(" + src.y0 + "," + src.x0 + ")")
        .attr("tabindex", 0).attr("role", "button")
        .on("click", function (ev, d) { activate(d); })
        .on("keydown", function (ev, d) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate(d); } });
      enter.append("use").attr("href", "#leaf").attr("class", "lf").attr("x", -9).attr("y", -9).attr("width", 18).attr("height", 18);
      enter.append("text").attr("dy", "0.32em").attr("x", 13);
      if (!reduce) enter.classed("new", true).style("--dl", function (d, i) { return Math.min(i * 0.025, 0.6) + "s"; });
      var all = enter.merge(node);
      all.attr("class", function (d) {
        var p = d.data.p, c = "node";
        if (d._children) c += " has";
        if (p.d) c += " mem";
        if (p.unknown) c += " unk";
        if (d.depth <= 1) c += " hh";
        if (hit[d._id]) c += " hit";
        if (this.classList && this.classList.contains("new") && !reduce) c += " new";
        return c;
      }).attr("aria-label", function (d) {
        var p = d.data.p, n = nodeName(d);
        var more = d._children ? ", " + d._children.length + " children folded" : (d.children ? ", open" : "");
        return n + (p.gen ? ", " + ORD[p.gen] + " generation" : "") + more;
      }).attr("aria-expanded", function (d) { return d.children ? "true" : (d._children ? "false" : null); });
      all.select("text").text(nodeName)
        .attr("x", function (d) { return (d.children || d._children) && d.depth > 0 ? -13 : 13; })
        .attr("text-anchor", function (d) { return (d.children || d._children) && d.depth > 0 ? "end" : "start"; });
      all.transition(t).attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });
      node.exit().transition(t).attr("transform", "translate(" + src.y + "," + src.x + ")").remove();

      var link = gl.selectAll("path.link").data(links, function (d) { return d.target._id; });
      link.enter().append("path").attr("class", "link").attr("pathLength", 1).attr("d", function () { var o = { x: src.x0, y: src.y0 }; return curve(o, o); })
        .merge(link).attr("class", function (d) {
          var was = this.getAttribute("class") || "", on = !!thread[d.target._id];
          if (on && was.indexOf("thread") < 0) { this.style.setProperty("--dl", (d.target.depth * 0.14) + "s"); }
          return "link" + (on ? " thread" : "");
        })
        .transition(t).attr("d", function (d) { return curve(d.source, d.target); });
      link.exit().transition(t).attr("d", function () { var o = { x: src.x, y: src.y }; return curve(o, o); }).remove();
      nodes.forEach(function (d) { d.x0 = d.x; d.y0 = d.y; });
    }
    function activate(d) {
      setThread(d._id);
      if (d._children) { d.children = d._children; d._children = null; chime(); }
      update(d);
      if (d._id !== "root" && d.depth > 1) personCard(d._id);
      else if (d.depth === 1) personCard(d._id);
    }
    function center(d, k) {
      var w = viz.clientWidth, h = viz.clientHeight;
      k = k || Math.max(d3.zoomTransform(svg.node()).k, 0.9);
      var phone = w < 700;
      svg.transition().duration(DUR).call(zoom.transform, d3.zoomIdentity.translate(w * ((d.children || d._children) ? 0.45 : (phone ? 0.42 : 0.55)) - d.y * k, h * (phone ? 0.25 : 0.5) - d.x * k).scale(k));
    }
    function fit() {
      layout(root);
      var ns = root.descendants();
      var x0 = d3.min(ns, function (d) { return d.x; }), x1 = d3.max(ns, function (d) { return d.x; });
      var y0 = d3.min(ns, function (d) { return d.y; }), y1 = d3.max(ns, function (d) { return d.y; }) + 200;
      var w = viz.clientWidth, h = viz.clientHeight;
      var k = Math.min(1.1, 0.92 * Math.min(w / (y1 - y0 + 40), h / (x1 - x0 + 40)));
      svg.transition().duration(DUR).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - k * (y0 + y1) / 2, h / 2 - k * (x0 + x1) / 2).scale(k));
    }
    function open(id) {
      var d = index[id], chain = [];
      while (d) { chain.unshift(d); d = d.parent; }
      chain.forEach(function (n) { if (n._children && n._id !== id) { n.children = n._children; n._children = null; } });
      return index[id];
    }
    reveal = function (id, withCard) {
      var d = open(id);
      hit = {}; hit[id] = true; setThread(id);
      update(d);
      if (viz.getBoundingClientRect().top < 0 || viz.getBoundingClientRect().top > window.innerHeight * 0.5) viz.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      center(d, 1);
      if (withCard) personCard(id);
    };
    showOnTree = function (ids) {
      hit = {};
      ids.forEach(function (id) { open(id); hit[id] = true; });
      update(root);
      if ($("list").hidden === false) toggleList();
      document.getElementById("tree").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () { center(index[ids[0]], 0.9); }, 60);
    };

    // search: names with their parents, so the four Michaels are distinguishable
    var dl = $("names"), opts = [], lookup = {};
    D.people.forEach(function (p) {
      if (p.unknown) return;
      var par = byId[p.parent];
      var key = p.n + (par ? ", child of " + label(par) : (p.gen === 1 ? " & " + p.sp : ""));
      if (lookup[key]) key += " (page " + p.page + ")";
      lookup[key] = p.id; opts.push(key);
      if (p.sp_added) { var k2 = p.sp + ", " + p.n + "'s husband"; lookup[k2] = p.id; opts.push(k2); }
      (p.partners || []).forEach(function (q, i) { var k3 = q.n + ", " + p.n + "'s " + q.rel.split(",")[0]; lookup[k3] = p.id + ":" + i; opts.push(k3); });
    });
    dl.innerHTML = opts.map(function (o) { return '<option value="' + esc(o) + '">'; }).join("");
    var find = $("find");
    function doFind() {
      var v = find.value.trim();
      if (lookup[v]) { var lk = lookup[v].split(":"); reveal(lk[0], lk.length === 1); if (lk.length > 1) partnerCard(lk[0], +lk[1]); return; }
      if (v.length < 2) return;
      var hits = searchHits(v);
      if (hits.length === 1) {
        if (hits[0].partner != null) { reveal(hits[0].id, false); partnerCard(hits[0].id, hits[0].partner); }
        else reveal(hits[0].id, true);
      } else if (hits.length) {
        hit = {}; hits.forEach(function (m) { open(m.id); hit[m.id] = true; }); update(root); center(index[hits[0].id], 0.8);
        chooserCard(v, hits);
      }
    }
    find.addEventListener("change", doFind);
    find.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doFind(); } });
    var hf = $("herofind");
    if (hf) {
      hf.hidden = false;
      var heroGo = function (e) {
        if (e) e.preventDefault();
        var v = $("hf").value.trim(); if (!v) return;
        if (!list.hidden) toggleList();
        find.value = v;
        document.getElementById("tree").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        setTimeout(doFind, reduce ? 0 : 400);
      };
      hf.addEventListener("submit", heroGo);
      $("hf").addEventListener("keydown", function (e) { if (e.key === "Enter") heroGo(e); });
    }
    $("fit").addEventListener("click", fit);
    $("toGordon").addEventListener("click", function () {
      var g = D.people.filter(function (p) { return p.anchor === "gordon"; })[0];
      if (g) reveal(g.id, true);
    });
    function toggleList() {
      var showList = list.hidden;
      list.hidden = !showList; viz.hidden = showList; $("hint").hidden = showList;
      $("asList").setAttribute("aria-pressed", String(showList));
      $("asList").textContent = showList ? "See the tree" : "Read as a list";
      if (!showList) fit();
    }
    $("asList").addEventListener("click", toggleList);

    update(root);
    fit();
    window.addEventListener("resize", function () { /* keep the user's view; nothing to do */ });
  }

  /* ---------- the map ---------- */
  function startMap() {
    if (!window.d3 || !window.topojson) return;
    var el = $("map");
    (window.US_ATLAS ? Promise.resolve(window.US_ATLAS) : fetch("data/us-states-10m.json").then(function (r) { return r.json(); })).then(function (us) {
      var W = 960, H = 600;
      var svg = d3.select(el).append("svg").attr("viewBox", "0 0 " + W + " " + H).attr("aria-hidden", "true");
      var proj = d3.geoAlbersUsa().scale(1250).translate([W / 2, H / 2]);
      var path = d3.geoPath(proj);
      var states = topojson.feature(us, us.objects.states).features;
      svg.append("g").selectAll("path").data(states).enter().append("path")
        .attr("class", function (d) { return "state" + (d.id === "13" ? " ga" : ""); }).attr("d", path);
      var arcs = svg.append("g").attr("class", "arcs").style("display", "none");
      var ga = states.filter(function (d) { return d.id === "13"; })[0];
      var from = path.centroid(ga);
      D.dest.forEach(function (d) {
        var to = proj([d.lon, d.lat]); if (!to) return;
        var mx = (from[0] + to[0]) / 2, my = Math.min(from[1], to[1]) - 70;
        arcs.append("path").attr("class", "arc").attr("d", "M" + from[0] + "," + from[1] + "Q" + mx + "," + my + " " + to[0] + "," + to[1]);
        arcs.append("circle").attr("cx", to[0]).attr("cy", to[1]).attr("r", 3.5).attr("fill", "var(--gilt)");
        arcs.append("text").attr("class", "dlabel").attr("x", to[0] + 6).attr("y", to[1] - 6).text(d.name);
      });
      var w = D.waycross, p = proj([w.lon, w.lat]);
      if (p) {
        svg.append("circle").attr("class", "pinring").attr("cx", p[0]).attr("cy", p[1]).attr("r", 13);
        svg.append("circle").attr("class", "pin").attr("cx", p[0]).attr("cy", p[1]).attr("r", 6);
        svg.append("text").attr("class", "pinlabel").attr("x", p[0] + 18).attr("y", p[1] + 5).text("Waycross");
      }
      var tools = document.querySelector(".maptools"); tools.hidden = false;
      var btn = $("mig"), txt = document.querySelector(".migtext"), cap = $("mapcap");
      btn.addEventListener("click", function () {
        var on = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", String(on));
        arcs.style("display", on ? null : "none");
        txt.classList.toggle("on", on);
        btn.textContent = on ? "Hide the Great Migration" : "Show the Great Migration, as general history";
        cap.textContent = on ? "Dashed lines: cities where many Georgians and other southern migrants settled, 1910 to 1970. General history of the era, not this family's moves." : "Waycross, Georgia, the one place the family book names.";
        el.setAttribute("aria-label", on ? "Map with Waycross marked, and dashed lines from Georgia to Detroit, Pittsburgh, New York, Chicago and Los Angeles showing the Great Migration as general history." : "Map of the United States with Waycross, Georgia marked.");
      });
    }).catch(function () { /* leave the text */ });
  }

  function go() { try { startTree(); } catch (e) { $("list").hidden = false; } try { startMap(); } catch (e) {} }
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
})();
