import { Component } from "react";
import { TITLES, MESES, SERIE, TABLERO, VIAJES, CARGAS } from "./data";
import { css } from "./utils";
import { supabase } from "./supabaseClient";
import logoRibeiro from "./assets/logo-ribeiro.png";
import despachosImg from "./assets/despachos-illustration.png";
import produccionImg from "./assets/produccion-illustration.png";
import tableroImg from "./assets/tablero-illustration.png";

class App extends Component {
  state = {
    screen: "home",
    desde: "2026-05-01",
    hasta: "2026-05-09",
    guia: "",
    turno: "Todas",
    loading: true,
    despachos: [],
    turnoProd: "Todos",
    produccion: [],
    novMes: "2026-08",
    nn: { fecha: "", texto: "" },
    np: { fecha: "", turno: "MAÑANA", clima: "SOLEADO", equipo: "IMPACTOR", ini: "", fin: "", texto: "" },
    pf: { desde: "2026-07-31", hasta: "2026-08-01", turno: "Todos", clima: "Todos", equipo: "Todos" },
    partes: [],
    novTextos: {},
    f: { date: "2026-08-14", hora: "", min: "", guia: "", carga: "", chofer: "" },
    p: { date: "", turno: "MAÑANA", lts: "", hs: "", clima: "", b1: "", b2: "", b3: "" }
  };

  componentDidMount() {
    Promise.all([
      this.fetchDespachos(),
      this.fetchProduccion(),
      this.fetchNovedadesCmass(),
      this.fetchPartes()
    ]).then(([despachos, produccion, novTextos, partes]) => {
      this.setState({ despachos, produccion, novTextos, partes, loading: false });
    });
  }

  async fetchDespachos() {
    const { data, error } = await supabase
      .from("despachos")
      .select("*")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });
    if (error) { console.error("fetchDespachos", error); return []; }
    return data.map((d) => ({
      id: d.id, chofer: d.chofer, fecha: d.fecha, hora: d.hora, guia: d.guia, carga: Number(d.carga)
    }));
  }

  async fetchProduccion() {
    const { data, error } = await supabase
      .from("produccion")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) { console.error("fetchProduccion", error); return []; }
    return data.map((p) => ({
      id: p.id, fecha: p.fecha, turno: p.turno, lts: Number(p.lts), hs: Number(p.hs)
    }));
  }

  async fetchNovedadesCmass() {
    const { data, error } = await supabase.from("novedades_cmass").select("*");
    if (error) { console.error("fetchNovedadesCmass", error); return {}; }
    const novTextos = {};
    data.forEach((row) => {
      const [y, m, d] = row.fecha.split("-");
      novTextos[y + "-" + m + "-" + Number(d)] = row.texto;
    });
    return novTextos;
  }

  async fetchPartes() {
    const { data, error } = await supabase
      .from("partes_diarios")
      .select("id, fecha, turno, clima, partes_equipos(id, equipo, inicio, fin, comentario)")
      .order("fecha", { ascending: false })
      .order("turno", { ascending: false });
    if (error) { console.error("fetchPartes", error); return []; }
    return data.map((p) => {
      const [y, m, d] = p.fecha.split("-");
      return {
        fecha: d + "/" + m + "/" + y,
        turno: p.turno,
        clima: p.clima || "",
        equipos: (p.partes_equipos || []).map((e) => ({
          equipo: e.equipo,
          inicio: e.inicio === null ? "" : e.inicio,
          fin: e.fin === null ? "" : e.fin,
          comentario: e.comentario || ""
        }))
      };
    });
  }

  go = (screen) => () => this.setState({ screen });

  fmt(n, dec) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }
  fechaTxt(iso) {
    if (!iso) return "—";
    const p = iso.split("-");
    return Number(p[2]) + " " + MESES[Number(p[1]) - 1] + " " + p[0];
  }
  setF(k) { return (e) => { const v = e.target.value; this.setState((s) => ({ f: Object.assign({}, s.f, { [k]: v }) })); }; }
  setP(k) { return (e) => { const v = e.target.value; this.setState((s) => ({ p: Object.assign({}, s.p, { [k]: v }) })); }; }

  points(vals, min, max) {
    const span = max - min || 1;
    return vals.map((v, i) => {
      const x = vals.length === 1 ? 160 : (i * 320) / (vals.length - 1);
      const y = 150 - ((v - min) / span) * 140;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
  }

  viewModel() {
    const s = this.state;
    const screen = s.screen;
    const showCharts = true;

    const desps = s.despachos.filter((d) =>
      !s.guia || (d.guia + " " + d.chofer).toLowerCase().includes(s.guia.toLowerCase())
    );
    const prods = s.produccion.filter((p) => s.turnoProd === "Todos" || p.turno === s.turnoProd);

    const totalTn = desps.reduce((a, d) => a + d.carga, 0);
    const prom = desps.length ? totalTn / desps.length : 0;

    const maxBar = Math.max.apply(null, SERIE.map((x) => Math.max(x.desp, x.prod)));
    const acopio = SERIE.map((x) => x.prod - x.desp);
    let acc = 0;
    const acum = acopio.map((v) => (acc += v));
    const allA = acopio.concat(acum);
    const minA = Math.min.apply(null, allA), maxA = Math.max.apply(null, allA);

    const totalProd = SERIE.reduce((a, x) => a + x.prod, 0);
    const totalDesp = SERIE.reduce((a, x) => a + x.desp, 0);
    const pctProdN = (totalProd / (totalProd + totalDesp)) * 100;

    const maxD = Math.max.apply(null, SERIE.map((x) => x.desp));
    const despPts = this.points(SERIE.map((x) => x.desp), 0, maxD);

    const pf = s.pf;
    const toIso = (dmy) => { const p = dmy.split("/"); return p[2] + "-" + p[1] + "-" + p[0]; };
    const partesFiltradas = s.partes
      .filter((p) => {
        const iso = toIso(p.fecha);
        if (pf.desde && iso < pf.desde) return false;
        if (pf.hasta && iso > pf.hasta) return false;
        if (pf.turno !== "Todos" && p.turno !== pf.turno) return false;
        if (pf.clima !== "Todos" && p.clima.indexOf(pf.clima) < 0) return false;
        if (pf.equipo !== "Todos" && !p.equipos.some((e) => e.equipo === pf.equipo)) return false;
        return true;
      })
      .map((p) => pf.equipo === "Todos" ? p : Object.assign({}, p, {
        equipos: p.equipos.filter((e) => e.equipo === pf.equipo)
      }));

    return {
      screenTitle: TITLES[screen],
      notHome: screen !== "home",
      isHome: screen === "home",
      isDespachos: screen === "despachos",
      isDespachoNew: screen === "despachoNew",
      isEstadisticas: screen === "estadisticas",
      isProduccion: screen === "produccion",
      isProduccionNew: screen === "produccionNew",
      isKpiProd: screen === "kpiProd",
      isDetalle: screen === "detalle",
      isKpiAluv: screen === "kpiAluv",
      isNovedades: screen === "novedades",
      goNovedades: this.go("novedades"),
      isViajes: screen === "viajes",
      isDetalleCargas: screen === "detalleCargas",
      goViajes: this.go("viajes"),
      goDetalleCargas: this.go("detalleCargas"),
      isTablero: TABLERO.indexOf(screen) >= 0,
      pagerLabel: (TABLERO.indexOf(screen) + 1) + " de 5",
      prevPage: () => this.setState((st) => {
        const i = TABLERO.indexOf(st.screen);
        return { screen: TABLERO[(i - 1 + TABLERO.length) % TABLERO.length] };
      }),
      nextPage: () => this.setState((st) => {
        const i = TABLERO.indexOf(st.screen);
        return { screen: TABLERO[(i + 1) % TABLERO.length] };
      }),
      viajesBars: VIAJES.map((v) => ({
        h: ((v.n / 160) * 100).toFixed(1) + "%",
        color: v.finde ? "#2A2A2A" : "#FFC800",
        label: v.n + " viajes"
      })),
      cargas: CARGAS.map((c, i) => ({
        fecha: c.fecha, guia: c.guia, turno: c.turno, cargadoPor: c.por,
        carga: c.carga, zebra: i % 2 ? "#F7F7F7" : "#FFFFFF"
      })),
      isNovProd: screen === "novProd",
      isNovProdNew: screen === "novProdNew",
      goNovProd: this.go("novProd"),
      goNovProdNew: this.go("novProdNew"),
      pfDesde: s.pf.desde, pfHasta: s.pf.hasta, pfTurno: s.pf.turno, pfClima: s.pf.clima, pfEquipo: s.pf.equipo,
      setPfDesde: (e) => { const v = e.target.value; this.setState((st) => ({ pf: Object.assign({}, st.pf, { desde: v }) })); },
      setPfHasta: (e) => { const v = e.target.value; this.setState((st) => ({ pf: Object.assign({}, st.pf, { hasta: v }) })); },
      setPfTurno: (e) => { const v = e.target.value; this.setState((st) => ({ pf: Object.assign({}, st.pf, { turno: v }) })); },
      setPfClima: (e) => { const v = e.target.value; this.setState((st) => ({ pf: Object.assign({}, st.pf, { clima: v }) })); },
      setPfEquipo: (e) => { const v = e.target.value; this.setState((st) => ({ pf: Object.assign({}, st.pf, { equipo: v }) })); },
      sinPartes: partesFiltradas.length === 0,
      partes: partesFiltradas.map((p, i) => ({
        fecha: p.fecha, turno: p.turno, clima: p.clima,
        bg: i % 2 ? "#FBE5D6" : "#FFFFFF",
        equipos: p.equipos.map((e) => ({
          equipo: e.equipo, inicio: e.inicio || "", fin: e.fin || "",
          marcha: (typeof e.inicio === "number" && typeof e.fin === "number") ? Math.abs(e.fin - e.inicio) : "—",
          comentario: e.comentario || "Sin comentarios."
        }))
      })),
      npFecha: s.np.fecha, npTurno: s.np.turno, npClima: s.np.clima, npEquipo: s.np.equipo,
      npIni: s.np.ini, npFin: s.np.fin, npTexto: s.np.texto,
      setNpFecha: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { fecha: v }) })); },
      setNpTurno: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { turno: v }) })); },
      setNpClima: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { clima: v }) })); },
      setNpEquipo: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { equipo: v }) })); },
      setNpIni: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { ini: v }) })); },
      setNpFin: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { fin: v }) })); },
      setNpTexto: (e) => { const v = e.target.value; this.setState((st) => ({ np: Object.assign({}, st.np, { texto: v }) })); },
      saveNovProd: () => {
        const np = this.state.np;
        if (!np.texto && !np.ini) { this.setState({ screen: "novProd" }); return; }
        const fechaIso = np.fecha || "2026-08-14";
        const fechaDmy = fechaIso.split("-").reverse().join("/");
        const inicio = Number(np.ini) || "";
        const fin = Number(np.fin) || "";
        const fila = { equipo: np.equipo, inicio, fin, comentario: np.texto };

        this.setState({
          screen: "novProd",
          np: { fecha: "", turno: "MAÑANA", clima: "SOLEADO", equipo: "IMPACTOR", ini: "", fin: "", texto: "" }
        });

        (async () => {
          let parteId;
          const { data: existing, error: findErr } = await supabase
            .from("partes_diarios").select("id").eq("fecha", fechaIso).eq("turno", np.turno).maybeSingle();
          if (findErr) { console.error("find parte", findErr); return; }
          if (existing) {
            parteId = existing.id;
          } else {
            const { data: created, error: insErr } = await supabase
              .from("partes_diarios").insert({ fecha: fechaIso, turno: np.turno, clima: np.clima }).select("id").single();
            if (insErr) { console.error("insert parte", insErr); return; }
            parteId = created.id;
          }
          const { error: eqErr } = await supabase.from("partes_equipos").insert({
            parte_id: parteId, equipo: np.equipo,
            inicio: inicio === "" ? null : inicio, fin: fin === "" ? null : fin,
            comentario: np.texto
          });
          if (eqErr) { console.error("insert parte equipo", eqErr); return; }

          this.setState((st) => {
            const partes = st.partes.slice();
            const idx = partes.findIndex((p) => p.fecha === fechaDmy && p.turno === np.turno);
            if (idx >= 0) {
              partes[idx] = Object.assign({}, partes[idx], { equipos: partes[idx].equipos.concat([fila]) });
            } else {
              partes.unshift({ fecha: fechaDmy, turno: np.turno, clima: np.clima, equipos: [fila] });
            }
            return { partes };
          });
        })();
      },
      isNovedadNew: screen === "novedadNew",
      goNovedadNew: this.go("novedadNew"),
      nnFecha: s.nn.fecha,
      nnTexto: s.nn.texto,
      setNnFecha: (e) => { const v = e.target.value; this.setState((st) => ({ nn: Object.assign({}, st.nn, { fecha: v }) })); },
      setNnTexto: (e) => { const v = e.target.value; this.setState((st) => ({ nn: Object.assign({}, st.nn, { texto: v }) })); },
      saveNovedad: () => {
        const nn = this.state.nn;
        if (!nn.fecha || !nn.texto) { this.setState({ screen: "novedades" }); return; }
        const texto = nn.texto.toUpperCase();
        const p = nn.fecha.split("-");
        const key = p[0] + "-" + p[1] + "-" + Number(p[2]);
        this.setState((st) => ({
          screen: "novedades",
          novMes: p[0] + "-" + p[1],
          novTextos: Object.assign({}, st.novTextos, { [key]: texto }),
          nn: { fecha: "", texto: "" }
        }));
        supabase.from("novedades_cmass").upsert({ fecha: nn.fecha, texto }, { onConflict: "fecha" }).then(({ error }) => {
          if (error) console.error("upsert novedad cmass", error);
        });
      },
      novMes: s.novMes,
      setNovMes: (e) => this.setState({ novMes: e.target.value }),
      novDias: (function (self) {
        const parts = s.novMes.split("-");
        const y = Number(parts[0]), m = Number(parts[1]) - 1;
        const dias = new Date(y, m + 1, 0).getDate();
        const nombres = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
        const rows = [];
        for (let n = 1; n <= dias; n++) {
          const dow = new Date(y, m, n).getDay();
          const key = s.novMes + "-" + n;
          const fechaIso = s.novMes + "-" + String(n).padStart(2, "0");
          rows.push({
            dia: nombres[dow],
            num: n,
            color: dow === 0 || dow === 6 ? "#C0392B" : "#1668C0",
            novedad: s.novTextos[key] || "",
            onChange: (e) => {
              const v = e.target.value;
              self.setState((st) => ({ novTextos: Object.assign({}, st.novTextos, { [key]: v }) }));
            },
            onBlur: (e) => {
              const v = e.target.value;
              if (!v) {
                supabase.from("novedades_cmass").delete().eq("fecha", fechaIso).then(({ error }) => {
                  if (error) console.error("delete novedad cmass", error);
                });
              } else {
                supabase.from("novedades_cmass").upsert({ fecha: fechaIso, texto: v }, { onConflict: "fecha" }).then(({ error }) => {
                  if (error) console.error("upsert novedad cmass", error);
                });
              }
            }
          });
        }
        return rows;
      })(this),
      showCharts,
      showBottomNav: true,

      goHome: this.go("home"),
      goBack: () => this.setState((st) => ({
        screen: st.screen === "despachoNew" ? "despachos"
          : st.screen === "produccionNew" ? "produccion"
          : st.screen === "novedadNew" ? "novedades"
          : st.screen === "novProd" ? "produccion"
          : st.screen === "novProdNew" ? "novProd"
          : st.screen === "detalle" ? "kpiProd"
          : st.screen === "estadisticas" ? "despachos" : "home"
      })),
      goDespachos: this.go("despachos"),
      goDespachoNew: this.go("despachoNew"),
      goEstadisticas: this.go("estadisticas"),
      goProduccion: this.go("produccion"),
      goProduccionNew: this.go("produccionNew"),
      goKpiProd: this.go("kpiProd"),
      goKpiAluv: this.go("kpiAluv"),
      goDetalle: this.go("detalle"),

      desde: s.desde, hasta: s.hasta, guia: s.guia, turno: s.turno,
      setDesde: (e) => this.setState({ desde: e.target.value }),
      setHasta: (e) => this.setState({ hasta: e.target.value }),
      setGuia: (e) => this.setState({ guia: e.target.value }),
      setTurno: (e) => this.setState({ turno: e.target.value }),

      despachosFiltrados: desps.map((d) => ({
        chofer: d.chofer,
        fechaTxt: this.fechaTxt(d.fecha),
        hora: d.hora,
        guia: d.guia,
        cargaTxt: this.fmt(d.carga, 1) + " tn",
        onDelete: () => {
          this.setState((st) => ({ despachos: st.despachos.filter((x) => x.id !== d.id) }));
          supabase.from("despachos").delete().eq("id", d.id).then(({ error }) => {
            if (error) console.error("delete despacho", error);
          });
        }
      })),
      sinDespachos: desps.length === 0,
      turnoProd: s.turnoProd,
      setTurnoProd: (e) => this.setState({ turnoProd: e.target.value }),
      produccionFiltrada: prods.map((p) => ({
        fechaTxt: this.fechaTxt(p.fecha),
        turno: p.turno,
        ltsTxt: p.lts + " lts",
        hsTxt: p.hs + " hs",
        onDelete: () => {
          this.setState((st) => ({ produccion: st.produccion.filter((x) => x.id !== p.id) }));
          supabase.from("produccion").delete().eq("id", p.id).then(({ error }) => {
            if (error) console.error("delete produccion", error);
          });
        }
      })),
      sinProduccion: prods.length === 0,

      hoyTn: this.fmt(totalTn, 1),
      hoyViajes: desps.length,
      hoyProm: this.fmt(prom, 1),
      estTotalTn: this.fmt(totalTn, 1) + " tn",
      estTotalCargas: desps.length + " viajes",
      estProm: this.fmt(prom, 1) + " tn",

      horas: ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"],
      fDate: s.f.date, fHora: s.f.hora, fMin: s.f.min, fGuia: s.f.guia, fCarga: s.f.carga, fChofer: s.f.chofer,
      setFDate: this.setF("date"), setFHora: this.setF("hora"), setFMin: this.setF("min"),
      setFGuia: this.setF("guia"), setFCarga: this.setF("carga"), setFChofer: this.setF("chofer"),
      saveDespacho: () => {
        const f = this.state.f;
        if (!f.carga) { this.setState({ screen: "despachos" }); return; }
        const nuevo = {
          fecha: f.date, hora: (f.hora || "00") + ":" + String(f.min || "00").padStart(2, "0"),
          guia: f.guia || "G-000000", carga: Number(f.carga), chofer: f.chofer || "Sin asignar"
        };
        this.setState({ screen: "despachos", f: { date: f.date, hora: "", min: "", guia: "", carga: "", chofer: "" } });
        supabase.from("despachos").insert(nuevo).select().single().then(({ data, error }) => {
          if (error) { console.error("insert despacho", error); return; }
          this.setState((st) => ({
            despachos: [{
              id: data.id, chofer: data.chofer, fecha: data.fecha, hora: data.hora, guia: data.guia, carga: Number(data.carga)
            }].concat(st.despachos)
          }));
        });
      },

      pDate: s.p.date, pTurno: s.p.turno, pLts: s.p.lts, pHs: s.p.hs,
      setPTurno: this.setP("turno"),
      pClima: s.p.clima, pB1: s.p.b1, pB2: s.p.b2, pB3: s.p.b3,
      setPDate: this.setP("date"), setPLts: this.setP("lts"),
      setPHs: this.setP("hs"), setPClima: this.setP("clima"),
      setPB1: this.setP("b1"), setPB2: this.setP("b2"), setPB3: this.setP("b3"),
      saveProduccion: () => {
        const p = this.state.p;
        if (!p.lts && !p.hs) { this.setState({ screen: "produccion" }); return; }
        const nuevo = { fecha: p.date || "2026-08-14", turno: p.turno, lts: Number(p.lts || 0), hs: Number(p.hs || 0) };
        this.setState({ screen: "produccion", p: { date: "", turno: "MAÑANA", lts: "", hs: "", clima: "", b1: "", b2: "", b3: "" } });
        supabase.from("produccion").insert(nuevo).select().single().then(({ data, error }) => {
          if (error) { console.error("insert produccion", error); return; }
          this.setState((st) => ({
            produccion: [{ id: data.id, fecha: data.fecha, turno: data.turno, lts: Number(data.lts), hs: Number(data.hs) }].concat(st.produccion)
          }));
        });
      },

      kProd: this.fmt(totalProd), kDesp: this.fmt(totalDesp), kAcopio: this.fmt(totalProd - totalDesp),
      serie: SERIE.map((x) => ({
        dia: x.f,
        hDesp: ((x.desp / maxBar) * 100).toFixed(1) + "%",
        hProd: ((x.prod / maxBar) * 100).toFixed(1) + "%"
      })),
      acopioPts: this.points(acopio, minA, maxA),
      acumPts: this.points(acum, minA, maxA),
      despPts,
      despAreaPts: "0,160 " + despPts + " 320,160",
      primerDia: "01 may 2026",
      ultimoDia: "09 may 2026",
      donutStop: pctProdN.toFixed(2) + "%",
      pctProd: pctProdN.toFixed(2).replace(".", ",") + "%",
      pctDesp: (100 - pctProdN).toFixed(2).replace(".", ",") + "%",
      tabla: SERIE.map((x, i) => ({
        fecha: x.f + "/2026",
        prod: x.prod ? this.fmt(x.prod, 2) : "—",
        desp: this.fmt(x.desp),
        acopio: this.fmt(acopio[i], 2),
        color: acopio[i] >= 0 ? "#146C14" : "#C82121",
        zebra: i % 2 ? "#FAFAFA" : "#FFFFFF"
      }))
    };
  }

  render() {
    if (this.state.loading) {
      return (
        <div style={css("min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#ECECEC;color:#5C5C5C;font-size:15px")}>
          Cargando datos…
        </div>
      );
    }
    const vm = this.viewModel();
    return (
      <div style={css("min-height:100dvh;display:flex;flex-direction:column;background:#ECECEC")}>
        <header style={css("background:#FFE500;border-bottom:2px solid #E3CB00;position:sticky;top:0;z-index:20")}>
          <div style={css("max-width:1440px;margin:0 auto;padding:10px 14px;display:flex;align-items:center;gap:12px;min-height:58px")}>
            <img src={logoRibeiro} alt="Ribeiro" style={css("flex:none;height:clamp(26px,5vw,34px);width:auto;display:block")} />
            <div style={css("width:1px;height:24px;background:rgba(0,0,0,.28)")}></div>
            <div style={css("font-size:clamp(13px,2.6vw,17px);font-weight:500;color:#2A2A2A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{vm.screenTitle}</div>
            {vm.notHome && (
              <button onClick={vm.goBack} aria-label="Volver" className="hov-dark" style={css("flex:none;margin-left:auto;min-height:44px;padding:0 18px 0 14px;border-radius:999px;border:none;color:#FFE500;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,.25)")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>
                Volver
              </button>
            )}
          </div>
        </header>

        <main style={css("flex:1;width:100%;max-width:1440px;margin:0 auto;padding:14px 14px 22px;display:flex;flex-direction:column;gap:12px")}>

          {vm.isHome && (
            <div style={css("display:flex;flex-direction:column;gap:18px;max-width:900px;width:100%;margin:0 auto")}>
              <button onClick={vm.goDespachos} className="home-card" style={css("cursor:pointer;border-radius:20px;padding:30px 24px 34px;display:flex;flex-direction:column;align-items:center;gap:18px")}>
                <div style={css("width:100%;max-width:170px;height:118px")}><img src={despachosImg} alt="" style={css("width:100%;height:100%;object-fit:contain;display:block")} /></div>
                <div style={css("font-size:19px;font-weight:400;color:#2A2A2A;text-align:center")}>Registro de despachos</div>
                <span style={css("background:#FFC800;border-radius:4px;padding:9px 20px;font-weight:600;font-size:13px;color:#111;white-space:nowrap")}>Ver registro</span>
              </button>
              <button onClick={vm.goProduccion} className="home-card" style={css("cursor:pointer;border-radius:20px;padding:30px 24px 34px;display:flex;flex-direction:column;align-items:center;gap:18px")}>
                <div style={css("width:100%;max-width:170px;height:118px")}><img src={produccionImg} alt="" style={css("width:100%;height:100%;object-fit:contain;display:block")} /></div>
                <div style={css("font-size:19px;font-weight:400;color:#2A2A2A;text-align:center")}>Registro de producción</div>
                <span style={css("background:#FFC800;border-radius:4px;padding:9px 20px;font-weight:600;font-size:13px;color:#111;white-space:nowrap")}>Ver registro</span>
              </button>
              <button onClick={vm.goKpiAluv} className="home-card" style={css("cursor:pointer;border-radius:20px;padding:30px 24px 34px;display:flex;flex-direction:column;align-items:center;gap:18px")}>
                <div style={css("width:100%;max-width:170px;height:118px")}><img src={tableroImg} alt="" style={css("width:100%;height:100%;object-fit:contain;display:block")} /></div>
                <div style={css("font-size:19px;font-weight:400;color:#2A2A2A;text-align:center")}>Tablero de Control</div>
                <span style={css("background:#FFC800;border-radius:4px;padding:9px 20px;font-weight:600;font-size:13px;color:#111;white-space:nowrap")}>Ver tablero</span>
              </button>
              <button onClick={vm.goNovedades} className="home-card" style={css("cursor:pointer;border-radius:20px;padding:30px 24px 34px;display:flex;flex-direction:column;align-items:center;gap:18px")}>
                <div style={css("width:100%;max-width:170px;height:118px;display:flex;align-items:center;justify-content:center;position:relative")}>
                  <svg viewBox="0 0 120 100" width="132" height="110" aria-hidden="true">
                    <rect x="16" y="16" width="80" height="62" rx="8" fill="#CFE3E0"></rect>
                    <rect x="26" y="28" width="26" height="7" rx="3.5" fill="#F2C14A"></rect>
                    <rect x="26" y="42" width="46" height="6" rx="3" fill="#FFFFFF" opacity=".85"></rect>
                    <rect x="26" y="54" width="34" height="6" rx="3" fill="#FFFFFF" opacity=".85"></rect>
                    <circle cx="86" cy="60" r="16" fill="#FFC800"></circle>
                    <path d="M86 52a6 6 0 0 1 6 6v5l2 3H78l2-3v-5a6 6 0 0 1 6-6z" fill="#3D4A63"></path>
                    <path d="M83 68h6a3 3 0 0 1-6 0z" fill="#3D4A63"></path>
                  </svg>
                </div>
                <div style={css("font-size:19px;font-weight:400;color:#2A2A2A;text-align:center")}>Novedades CMASS</div>
                <span style={css("background:#FFC800;border-radius:4px;padding:9px 20px;font-weight:600;font-size:13px;color:#111;white-space:nowrap")}>Ver novedades</span>
              </button>
            </div>
          )}

          {vm.isNovedades && (
            <div style={css("display:flex;flex-direction:column;gap:12px;max-width:1000px;width:100%;margin:0 auto")}>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Mes
                  <input type="month" value={vm.novMes} onChange={vm.setNovMes} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
              </div>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;overflow:auto")}>
                <div style={css("min-width:620px")}>
                  <div style={css("display:grid;grid-template-columns:90px 170px 1fr;background:#1668C0")}>
                    <div style={css("padding:10px 14px;color:#fff;font-size:13px;font-weight:700;letter-spacing:.04em;text-align:center;border-right:1px solid rgba(255,255,255,.35)")}>FECHA</div>
                    <div style={css("padding:10px 14px;color:#fff;font-size:13px;font-weight:700;letter-spacing:.04em;text-align:center;border-right:1px solid rgba(255,255,255,.35)")}>NOVEDADES CMASS</div>
                    <div></div>
                  </div>
                  <div style={css("display:grid;grid-template-columns:90px 170px 1fr;border-bottom:1px solid #E4E4E4")}>
                    <div style={css("border-right:1px solid #E4E4E4")}></div>
                    <div style={css("padding:9px 14px;font-size:13px;font-weight:700;color:#1F1F1F;border-right:1px solid #E4E4E4")}>DIA</div>
                    <div style={css("padding:9px 14px;font-size:13px;font-weight:700;color:#1F1F1F;text-align:center")}>NOVEDAD</div>
                  </div>
                  {vm.novDias.map((d, i) => (
                    <div key={i} style={css("display:grid;grid-template-columns:90px 170px 1fr;border-bottom:1px solid #EFEFEF;align-items:stretch")}>
                      <div style={css("padding:9px 14px;font-size:13px;text-align:center;border-right:1px solid #EFEFEF;font-variant-numeric:tabular-nums")}>{d.num}</div>
                      <div style={css(`padding:9px 14px;font-size:13px;color:${d.color};border-right:1px solid #EFEFEF`)}>{d.dia}</div>
                      <input type="text" value={d.novedad} onChange={d.onChange} onBlur={d.onBlur} placeholder="Sin novedades" style={css("border:none;padding:9px 14px;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;background:transparent;color:#1F1F1F;width:100%")} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={css("font-size:12px;color:#7A7A7A")}>Los días con tareas suspendidas quedan registrados en el parte diario.</div>
              <button onClick={vm.goNovedadNew} className="hov-blue" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>+ Agregar novedad</button>
            </div>
          )}

          {vm.isNovedadNew && (
            <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;max-width:1000px;width:100%;margin:0 auto")}>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha
                  <input type="date" value={vm.nnFecha} onChange={vm.setNnFecha} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
              </div>
              <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Novedad
                <textarea rows={3} value={vm.nnTexto} onChange={vm.setNnTexto} placeholder="Ej: TAREAS SUSPENDIDAS POR MALAS CONDICIONES CLIMÁTICAS" style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;font-family:inherit;background:#fff;resize:vertical")} />
              </label>
              <div style={css("display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #EDEDED;padding-top:14px")}>
                <button onClick={vm.goNovedades} className="hov-outline" style={css("flex:1 1 140px;min-height:48px;border:1px solid #C9C9C9;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer")}>Cancelar</button>
                <button onClick={vm.saveNovedad} className="hov-dark" style={css("flex:1 1 140px;min-height:48px;border:none;border-radius:8px;color:#FFE500;font-size:16px;font-weight:600;cursor:pointer")}>Enviar</button>
              </div>
            </div>
          )}

          {vm.isDespachos && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha y hora de inicio
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7;color:#141414")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha y hora de fin
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7;color:#141414")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Número de guía
                  <input type="text" placeholder="Buscar guía…" value={vm.guia} onChange={vm.setGuia} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7;color:#141414")} />
                </label>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:8px")}>
                {vm.despachosFiltrados.map((d, i) => (
                  <div key={i} style={css("background:#fff;border:1px solid #E1E1E1;border-left:5px solid #1370C4;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                    <div style={css("flex:1 1 180px;min-width:150px")}>
                      <div style={css("font-weight:600;font-size:15px")}>{d.chofer}</div>
                      <div style={css("font-size:13px;color:#6B6B6B")}>{d.fechaTxt} · {d.hora} · Guía {d.guia}</div>
                    </div>
                    <div style={css("text-align:center")}>
                      <div style={css("font-size:11px;letter-spacing:.12em;color:#6B6B6B;font-weight:600")}>CARGA</div>
                      <div style={css("background:#FFC800;border-radius:999px;padding:8px 20px;font-weight:400;font-size:20px;min-width:96px")}>{d.cargaTxt}</div>
                    </div>
                    <button onClick={d.onDelete} aria-label="Eliminar" className="hov-danger-icon" style={css("flex:none;width:44px;height:44px;border-radius:50%;border:none;color:#E23A3A;font-size:22px;cursor:pointer")}>⊗</button>
                  </div>
                ))}
                {vm.sinDespachos && (
                  <div style={css("background:#fff;border:1px dashed #CFCFCF;border-radius:10px;padding:34px;text-align:center;color:#7A7A7A;font-size:15px")}>Sin cargas en el período seleccionado.</div>
                )}
              </div>
              <div style={css("display:flex;flex-direction:column;gap:8px;position:sticky;bottom:0;padding-top:6px;background:linear-gradient(to top,#ECECEC 60%,rgba(236,236,236,0))")}>
                <button onClick={vm.goEstadisticas} className="hov-green" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>Resumen</button>
                <button onClick={vm.goDespachoNew} className="hov-blue" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>+ Nueva carga</button>
              </div>
            </>
          )}

          {vm.isDespachoNew && (
            <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha
                  <input type="date" value={vm.fDate} onChange={vm.setFDate} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Hora
                  <select value={vm.fHora} onChange={vm.setFHora} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="">Seleccionar…</option>
                    {vm.horas.map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Minutos
                  <input type="number" min="0" max="59" placeholder="0" value={vm.fMin} onChange={vm.setFMin} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Nro de Guía
                  <input type="text" placeholder="G-000000" value={vm.fGuia} onChange={vm.setFGuia} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Carga (tn)
                  <input type="number" min="0" step="0.1" placeholder="0,0" value={vm.fCarga} onChange={vm.setFCarga} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Chofer
                  <input type="text" placeholder="Nombre y apellido" value={vm.fChofer} onChange={vm.setFChofer} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
              </div>
              <div style={css("display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #EDEDED;padding-top:14px")}>
                <button onClick={vm.goDespachos} className="hov-outline" style={css("flex:1 1 140px;min-height:48px;border:1px solid #C9C9C9;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer")}>Cancelar</button>
                <button onClick={vm.saveDespacho} className="hov-dark" style={css("flex:1 1 140px;min-height:48px;border:none;border-radius:8px;color:#FFE500;font-size:16px;font-weight:600;cursor:pointer")}>Enviar</button>
              </div>
            </div>
          )}

          {vm.isEstadisticas && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha de inicio
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha de fin
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px")}>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;min-height:130px")}>
                  <div style={css("font-size:12px;letter-spacing:.12em;color:#6B6B6B;font-weight:600")}>TOTAL TN</div>
                  <div style={css("font-size:clamp(34px,7vw,46px);font-weight:300;line-height:1")}>{vm.estTotalTn}</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;min-height:130px")}>
                  <div style={css("font-size:12px;letter-spacing:.12em;color:#6B6B6B;font-weight:600")}>TOTAL CARGAS</div>
                  <div style={css("font-size:clamp(34px,7vw,46px);font-weight:300;line-height:1")}>{vm.estTotalCargas}</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;min-height:130px")}>
                  <div style={css("font-size:12px;letter-spacing:.12em;color:#6B6B6B;font-weight:600")}>CARGA PROMEDIO</div>
                  <div style={css("font-size:clamp(34px,7vw,46px);font-weight:300;line-height:1")}>{vm.estProm}</div>
                </div>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:8px")}>
                <button onClick={vm.goKpiAluv} className="hov-green" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>Estadísticas completas</button>
                <button onClick={vm.goDespachoNew} className="hov-blue" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>+ Nueva carga</button>
              </div>
            </>
          )}

          {vm.isProduccion && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha y hora de inicio
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha y hora de fin
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.turnoProd} onChange={vm.setTurnoProd} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todos">Todos</option>
                    <option value="MAÑANA">Mañana</option>
                    <option value="NOCHE">Noche</option>
                  </select>
                </label>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:8px")}>
                {vm.produccionFiltrada.map((p, i) => (
                  <div key={i} style={css("background:#fff;border:1px solid #E1E1E1;border-left:5px solid #1370C4;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                    <div style={css("flex:1 1 170px;min-width:140px;display:flex;flex-direction:column;gap:5px;align-items:flex-start")}>
                      <div style={css("font-weight:600;font-size:15px")}>{p.fechaTxt}</div>
                      <span style={css("background:#111;color:#FFE500;border-radius:999px;padding:3px 11px;font-size:11px;font-weight:600;letter-spacing:.06em")}>{p.turno}</span>
                    </div>
                    <div style={css("display:flex;gap:10px;flex-wrap:wrap")}>
                      <div style={css("text-align:center")}>
                        <div style={css("font-size:11px;letter-spacing:.1em;color:#6B6B6B;font-weight:600")}>LTS COMB</div>
                        <div style={css("background:#FFC800;border-radius:999px;padding:8px 18px;font-weight:400;font-size:19px;min-width:86px")}>{p.ltsTxt}</div>
                      </div>
                      <div style={css("text-align:center")}>
                        <div style={css("font-size:11px;letter-spacing:.1em;color:#6B6B6B;font-weight:600")}>HRS MAQ</div>
                        <div style={css("background:#FFC800;border-radius:999px;padding:8px 18px;font-weight:400;font-size:19px;min-width:86px")}>{p.hsTxt}</div>
                      </div>
                    </div>
                    <button onClick={p.onDelete} aria-label="Eliminar" className="hov-danger-icon" style={css("flex:none;width:44px;height:44px;border-radius:50%;border:none;color:#E23A3A;font-size:22px;cursor:pointer")}>⊗</button>
                  </div>
                ))}
                {vm.sinProduccion && (
                  <div style={css("background:#fff;border:1px dashed #CFCFCF;border-radius:10px;padding:34px;text-align:center;color:#7A7A7A;font-size:15px")}>Sin registros de producción.</div>
                )}
              </div>
              <div style={css("position:sticky;bottom:0;padding-top:6px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(to top,#ECECEC 60%,rgba(236,236,236,0))")}>
                <button onClick={vm.goNovProd} className="hov-green" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>Novedades de producción</button>
                <button onClick={vm.goProduccionNew} className="hov-blue" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>+ Nueva carga</button>
              </div>
            </>
          )}

          {vm.isProduccionNew && (
            <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha
                  <input type="date" value={vm.pDate} onChange={vm.setPDate} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.pTurno} onChange={vm.setPTurno} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="MAÑANA">Mañana</option>
                    <option value="NOCHE">Noche</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Lts de combustible
                  <input type="number" min="0" placeholder="0" value={vm.pLts} onChange={vm.setPLts} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Horas de máquina
                  <input type="number" min="0" placeholder="0" value={vm.pHs} onChange={vm.setPHs} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Clima
                  <select value={vm.pClima} onChange={vm.setPClima} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="">Seleccionar…</option>
                    <option value="SOLEADO">Soleado</option>
                    <option value="NUBLADO">Nublado</option>
                    <option value="HUMEDAD">Humedad</option>
                    <option value="LLUVIA">Lluvia</option>
                    <option value="VIENTO">Viento</option>
                    <option value="NIEVE">Nieve</option>
                  </select>
                </label>
              </div>
              <div style={css("border-top:1px solid #EDEDED;padding-top:12px;display:flex;flex-direction:column;gap:10px")}>
                <div style={css("font-size:12px;letter-spacing:.12em;color:#6B6B6B;font-weight:600")}>MINUTOS POR BALDE</div>
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px")}>
                  <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Toma 1
                    <input type="number" min="0" placeholder="0" value={vm.pB1} onChange={vm.setPB1} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                  </label>
                  <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Toma 2
                    <input type="number" min="0" placeholder="0" value={vm.pB2} onChange={vm.setPB2} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                  </label>
                  <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Toma 3
                    <input type="number" min="0" placeholder="0" value={vm.pB3} onChange={vm.setPB3} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                  </label>
                </div>
              </div>
              <div style={css("display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #EDEDED;padding-top:14px")}>
                <button onClick={vm.goProduccion} className="hov-outline" style={css("flex:1 1 140px;min-height:48px;border:1px solid #C9C9C9;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer")}>Cancelar</button>
                <button onClick={vm.saveProduccion} className="hov-dark" style={css("flex:1 1 140px;min-height:48px;border:none;border-radius:8px;color:#FFE500;font-size:16px;font-weight:600;cursor:pointer")}>Enviar</button>
              </div>
            </div>
          )}

          {vm.isKpiProd && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período desde
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período hasta
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.turno} onChange={vm.setTurno} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todas">Todas</option>
                    <option value="Turno A">Turno A</option>
                    <option value="Turno B">Turno B</option>
                  </select>
                </label>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px")}>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>{vm.kProd}</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Producción total (tn)</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>{vm.kAcopio}</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Acopio (tn)</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>{vm.kDesp}</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Total despachado (tn)</div>
                </div>
              </div>
              {vm.showCharts && (
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px")}>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;overflow:hidden")}>
                    <div style={css("font-size:16px;font-weight:600")}>Despacho y producción por fecha</div>
                    <div style={css("display:flex;gap:16px;font-size:12px;color:#5C5C5C;flex-wrap:wrap")}>
                      <span style={css("display:flex;align-items:center;gap:6px")}><i style={css("width:10px;height:10px;border-radius:50%;background:#1E9BF0;display:inline-block")}></i>Despacho</span>
                      <span style={css("display:flex;align-items:center;gap:6px")}><i style={css("width:10px;height:10px;border-radius:50%;background:#1E1EB4;display:inline-block")}></i>Producción</span>
                    </div>
                    <div style={css("display:flex;align-items:flex-end;gap:clamp(6px,2vw,16px);height:clamp(200px,32vh,300px);overflow-x:auto;padding-bottom:4px")}>
                      {vm.serie.map((s, i) => (
                        <div key={i} style={css("flex:1 1 0;min-width:46px;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:6px")}>
                          <div style={css("flex:1;display:flex;align-items:flex-end;gap:3px")}>
                            <div style={css(`flex:1;background:#1E9BF0;border-radius:3px 3px 0 0;height:${s.hDesp}`)}></div>
                            <div style={css(`flex:1;background:#1E1EB4;border-radius:3px 3px 0 0;height:${s.hProd}`)}></div>
                          </div>
                          <div style={css("font-size:11px;color:#6B6B6B;text-align:center;white-space:nowrap")}>{s.dia}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
                    <div style={css("font-size:16px;font-weight:600")}>Acopio (tn)</div>
                    <div style={css("height:clamp(180px,28vh,260px);position:relative")}>
                      <svg viewBox="0 0 320 160" preserveAspectRatio="none" style={css("width:100%;height:100%;display:block")}>
                        <line x1="0" y1="80" x2="320" y2="80" stroke="#BFE0FA" strokeWidth="1" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"></line>
                        <polyline points={vm.acopioPts} fill="none" stroke="#1E9BF0" strokeWidth="2.5" vectorEffect="non-scaling-stroke"></polyline>
                        <polyline points={vm.acumPts} fill="none" stroke="#1E1EB4" strokeWidth="2.5" vectorEffect="non-scaling-stroke"></polyline>
                      </svg>
                    </div>
                    <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#6B6B6B")}>
                      <span>{vm.primerDia}</span><span>{vm.ultimoDia}</span>
                    </div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
                    <div style={css("font-size:16px;font-weight:600")}>Distribución producción / despacho</div>
                    <div style={css("display:flex;align-items:center;gap:22px;flex-wrap:wrap")}>
                      <div style={css(`width:150px;height:150px;border-radius:50%;background:conic-gradient(#1E9BF0 0 ${vm.donutStop}, #1E1EB4 ${vm.donutStop} 100%);display:flex;align-items:center;justify-content:center`)}>
                        <div style={css("width:84px;height:84px;border-radius:50%;background:#fff")}></div>
                      </div>
                      <div style={css("display:flex;flex-direction:column;gap:10px;font-size:14px")}>
                        <span style={css("display:flex;align-items:center;gap:8px")}><i style={css("width:12px;height:12px;border-radius:3px;background:#1E9BF0;display:inline-block")}></i>Producción {vm.pctProd}</span>
                        <span style={css("display:flex;align-items:center;gap:8px")}><i style={css("width:12px;height:12px;border-radius:3px;background:#1E1EB4;display:inline-block")}></i>Despacho {vm.pctDesp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px")}>
                <button onClick={vm.goDetalle} className="hov-dark" style={css("min-height:48px;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-align:left;padding:0 18px")}>→ Detalle de producción</button>
                <button onClick={vm.goKpiAluv} className="hov-dark" style={css("min-height:48px;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-align:left;padding:0 18px")}>→ KPIs Aluvional</button>
              </div>
            </>
          )}

          {vm.isDetalle && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;overflow:auto")}>
                <div style={css("min-width:520px")}>
                  <div style={css("display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr;gap:0;border-bottom:2px solid #1370C4;padding:12px 14px;font-size:13px;font-weight:600;color:#3A3A3A;position:sticky;top:0;background:#fff")}>
                    <div>Fecha</div><div style={css("text-align:right")}>Producción</div><div style={css("text-align:right")}>Despacho</div><div style={css("text-align:right")}>Acopio</div>
                  </div>
                  {vm.tabla.map((r, i) => (
                    <div key={i} style={css(`display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr;padding:12px 14px;border-bottom:1px solid #F0F0F0;font-size:14px;background:${r.zebra}`)}>
                      <div>{r.fecha}</div>
                      <div style={css("text-align:right;font-variant-numeric:tabular-nums")}>{r.prod}</div>
                      <div style={css("text-align:right;font-variant-numeric:tabular-nums")}>{r.desp}</div>
                      <div style={css(`text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${r.color}`)}>{r.acopio}</div>
                    </div>
                  ))}
                  <div style={css("display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr;padding:14px;font-size:15px;font-weight:700;background:#FAFAFA;border-top:2px solid #111")}>
                    <div>Total</div>
                    <div style={css("text-align:right")}>{vm.kProd}</div>
                    <div style={css("text-align:right")}>{vm.kDesp}</div>
                    <div style={css("text-align:right")}>{vm.kAcopio}</div>
                  </div>
                </div>
              </div>
              <div style={css("font-size:13px;color:#6B6B6B")}>Acopio en verde: producción por encima del despacho. En rojo: días sin producción registrada.</div>
            </>
          )}

          {vm.isKpiAluv && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período desde
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período hasta
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.turno} onChange={vm.setTurno} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todas">Todas</option>
                    <option value="Turno A">Turno A</option>
                    <option value="Turno B">Turno B</option>
                  </select>
                </label>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px")}>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>{vm.kDesp}</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Total despachado (tn)</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>774</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Cantidad de cargas</div>
                </div>
                <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:18px;text-align:center")}>
                  <div style={css("font-size:clamp(32px,7vw,44px);font-weight:300;line-height:1")}>33,0</div>
                  <div style={css("font-size:13px;color:#5C5C5C;margin-top:4px")}>Carga promedio (tn)</div>
                </div>
              </div>
              {vm.showCharts && (
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px")}>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
                    <div style={css("font-size:16px;font-weight:600")}>Carga (tn) por turno</div>
                    <div style={css("display:flex;align-items:flex-end;gap:26px;height:clamp(170px,26vh,240px);justify-content:center")}>
                      <div style={css("flex:0 0 74px;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:8px;text-align:center")}>
                        <div style={css("font-size:14px;font-weight:700")}>13.638</div>
                        <div style={css("background:#1E9BF0;border-radius:4px 4px 0 0;height:100%")}></div>
                        <div style={css("font-size:12px;color:#5C5C5C")}>Turno A</div>
                      </div>
                      <div style={css("flex:0 0 74px;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:8px;text-align:center")}>
                        <div style={css("font-size:14px;font-weight:700")}>11.889</div>
                        <div style={css("background:#1E9BF0;border-radius:4px 4px 0 0;height:87%")}></div>
                        <div style={css("font-size:12px;color:#5C5C5C")}>Turno B</div>
                      </div>
                    </div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px")}>
                    <div style={css("font-size:15px;font-weight:600")}>% Cumplimiento de carga</div>
                    <svg viewBox="0 0 180 108" style={css("width:100%;max-width:230px;margin:0 auto;display:block")}>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#EDEDED" strokeWidth="18" strokeLinecap="butt"></path>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#E0605F" strokeWidth="18" strokeDasharray="132 220"></path>
                      <text x="90" y="92" textAnchor="middle" fontFamily="Segoe UI" fontSize="26" fontWeight="600" fill="#4A4A4A">90,04%</text>
                    </svg>
                    <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#7A7A7A")}><span>0%</span><span>150%</span></div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px")}>
                    <div style={css("font-size:15px;font-weight:600")}>Carga total vs objetivo (tn)</div>
                    <svg viewBox="0 0 180 108" style={css("width:100%;max-width:230px;margin:0 auto;display:block")}>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#EDEDED" strokeWidth="18"></path>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#E0605F" strokeWidth="18" strokeDasharray="131 220"></path>
                      <text x="90" y="92" textAnchor="middle" fontFamily="Segoe UI" fontSize="24" fontWeight="600" fill="#4A4A4A">25.527</text>
                    </svg>
                    <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#7A7A7A")}><span>0</span><span>43 mil</span></div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px")}>
                    <div style={css("font-size:15px;font-weight:600")}>Carga promedio vs objetivo</div>
                    <svg viewBox="0 0 180 108" style={css("width:100%;max-width:230px;margin:0 auto;display:block")}>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#EDEDED" strokeWidth="18"></path>
                      <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="#1E7B1E" strokeWidth="18" strokeDasharray="161 220"></path>
                      <text x="90" y="92" textAnchor="middle" fontFamily="Segoe UI" fontSize="26" fontWeight="600" fill="#4A4A4A">33,0</text>
                    </svg>
                    <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#7A7A7A")}><span>0</span><span>45</span></div>
                  </div>
                  <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px;grid-column:1/-1")}>
                    <div>
                      <div style={css("font-size:16px;font-weight:600")}>Despachos</div>
                      <div style={css("font-size:13px;color:#6B6B6B")}>Detalle de tn despachadas</div>
                    </div>
                    <div style={css("height:clamp(170px,26vh,240px)")}>
                      <svg viewBox="0 0 320 160" preserveAspectRatio="none" style={css("width:100%;height:100%;display:block")}>
                        <polygon points={vm.despAreaPts} fill="#BFE0FA"></polygon>
                        <polyline points={vm.despPts} fill="none" stroke="#1E9BF0" strokeWidth="2" vectorEffect="non-scaling-stroke"></polyline>
                      </svg>
                    </div>
                    <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#6B6B6B")}><span>{vm.primerDia}</span><span>{vm.ultimoDia}</span></div>
                  </div>
                </div>
              )}
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px")}>
                <button onClick={vm.goDetalleCargas} className="hov-dark" style={css("min-height:48px;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-align:left;padding:0 18px")}>→ Detalle de cargas</button>
                <button onClick={vm.goViajes} className="hov-dark" style={css("min-height:48px;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-align:left;padding:0 18px")}>→ Detalle de viajes</button>
              </div>
            </>
          )}

          {vm.isViajes && (
            <>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período desde
                  <input type="date" value={vm.desde} onChange={vm.setDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Período hasta
                  <input type="date" value={vm.hasta} onChange={vm.setHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.turno} onChange={vm.setTurno} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todas">Todas</option>
                    <option value="Turno A">Turno A</option>
                    <option value="Turno B">Turno B</option>
                  </select>
                </label>
              </div>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px")}>
                <div>
                  <div style={css("font-size:17px;font-weight:600")}>Viajes</div>
                  <div style={css("font-size:13px;color:#6B6B6B")}>Detalle de viajes por día</div>
                </div>
                <div style={css("display:flex;gap:18px;font-size:12px;color:#5C5C5C;flex-wrap:wrap")}>
                  <span style={css("display:flex;align-items:center;gap:6px")}><i style={css("width:10px;height:10px;border-radius:50%;background:#FFC800;display:inline-block")}></i>Día hábil</span>
                  <span style={css("display:flex;align-items:center;gap:6px")}><i style={css("width:10px;height:10px;border-radius:50%;background:#2A2A2A;display:inline-block")}></i>Fin de semana</span>
                </div>
                <div style={css("position:relative;height:clamp(220px,38vh,340px);display:flex;align-items:flex-end;gap:2px;padding-bottom:2px")}>
                  <div style={css("position:absolute;left:0;right:0;bottom:33%;border-top:1px dashed #6EB8F0;pointer-events:none")}></div>
                  {vm.viajesBars.map((v, i) => (
                    <div key={i} title={v.label} style={css(`flex:1 1 0;min-width:2px;height:${v.h};background:${v.color};border-radius:1px`)}></div>
                  ))}
                </div>
                <div style={css("display:flex;justify-content:space-between;font-size:11px;color:#6B6B6B")}>
                  <span>abr 2026</span><span>jun 2026</span><span>ago 2026</span>
                </div>
                <div style={css("font-size:12px;color:#7A7A7A")}>Línea de referencia: 50 viajes/día</div>
              </div>
            </>
          )}

          {vm.isDetalleCargas && (
            <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;overflow:auto")}>
              <div style={css("min-width:640px")}>
                <div style={css("display:grid;grid-template-columns:1fr 1.1fr .9fr 1.4fr .9fr;padding:12px 14px;border-bottom:2px solid #1370C4;font-size:13px;font-weight:600;color:#3A3A3A;position:sticky;top:0;background:#fff")}>
                  <div>Fecha y hora</div><div>Nro de Guía</div><div>Turno</div><div>Cargado por</div><div style={css("text-align:right")}>Suma de Carga (tn)</div>
                </div>
                {vm.cargas.map((c, i) => (
                  <div key={i} style={css(`display:grid;grid-template-columns:1fr 1.1fr .9fr 1.4fr .9fr;padding:11px 14px;border-bottom:1px solid #F0F0F0;font-size:14px;background:${c.zebra}`)}>
                    <div>{c.fecha}</div><div>{c.guia}</div><div>{c.turno}</div><div>{c.cargadoPor}</div>
                    <div style={css("text-align:right;font-variant-numeric:tabular-nums")}>{c.carga}</div>
                  </div>
                ))}
                <div style={css("display:grid;grid-template-columns:1fr 1.1fr .9fr 1.4fr .9fr;padding:14px;font-size:15px;font-weight:700;background:#FAFAFA;border-top:2px solid #111")}>
                  <div>Total</div><div></div><div></div><div></div><div style={css("text-align:right")}>159.079</div>
                </div>
              </div>
            </div>
          )}

          {vm.isTablero && (
            <div style={css("display:flex;align-items:center;justify-content:center;gap:14px;padding:6px 0 2px")}>
              <button onClick={vm.prevPage} aria-label="Página anterior" className="hov-round" style={css("width:40px;height:40px;border-radius:50%;border:1px solid #D5D5D5;color:#333;font-size:17px;cursor:pointer")}>‹</button>
              <div style={css("font-size:14px;color:#4A4A4A;min-width:70px;text-align:center")}>{vm.pagerLabel}</div>
              <button onClick={vm.nextPage} aria-label="Página siguiente" className="hov-round" style={css("width:40px;height:40px;border-radius:50%;border:1px solid #D5D5D5;color:#333;font-size:17px;cursor:pointer")}>›</button>
            </div>
          )}

          {vm.isNovProd && (
            <div style={css("display:flex;flex-direction:column;gap:14px;max-width:1100px;width:100%;margin:0 auto")}>
              <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Desde
                  <input type="date" value={vm.pfDesde} onChange={vm.setPfDesde} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Hasta
                  <input type="date" value={vm.pfHasta} onChange={vm.setPfHasta} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.pfTurno} onChange={vm.setPfTurno} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todos">Todos</option>
                    <option value="MAÑANA">Mañana</option>
                    <option value="NOCHE">Noche</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Clima
                  <select value={vm.pfClima} onChange={vm.setPfClima} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todos">Todos</option>
                    <option value="SOLEADO">Soleado</option>
                    <option value="NUBLADO">Nublado</option>
                    <option value="HUMEDAD">Humedad</option>
                    <option value="LLUVIA">Lluvia</option>
                    <option value="VIENTO">Viento</option>
                    <option value="NIEVE">Nieve</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Equipo
                  <select value={vm.pfEquipo} onChange={vm.setPfEquipo} style={css("width:100%;padding:11px 12px;border:1px solid #D9D9D9;border-radius:8px;font-size:15px;background:#F7F7F7")}>
                    <option value="Todos">Todos</option>
                    <option value="IMPACTOR">Impactor</option>
                    <option value="ZARANDA 01">Zaranda 01</option>
                    <option value="ZARANDA 02">Zaranda 02</option>
                  </select>
                </label>
              </div>
              {vm.sinPartes && (
                <div style={css("background:#fff;border:1px dashed #CFCFCF;border-radius:12px;padding:34px;text-align:center;color:#7A7A7A;font-size:15px")}>Sin novedades para los filtros seleccionados.</div>
              )}
              {vm.partes.map((p, i) => (
                <div key={i} style={css("background:#fff;border:1px solid #E4E4E4;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.05);overflow:hidden")}>
                  <div style={css("background:#F6F8FB;border-bottom:1px solid #E4E4E4;padding:14px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                    <div style={css("font-size:17px;font-weight:600;color:#1F1F1F")}>{p.fecha}</div>
                    <span style={css("background:#111;color:#FFE500;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;letter-spacing:.06em")}>{p.turno}</span>
                    <span style={css("background:#FFE500;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;letter-spacing:.06em;color:#111")}>{p.clima}</span>
                  </div>
                  <div style={css("overflow-x:auto")}>
                    <div style={css("min-width:780px")}>
                      <div style={css("display:grid;grid-template-columns:150px 90px 90px 100px 1fr;background:#FAFAFA;border-bottom:1px solid #E4E4E4")}>
                        <div style={css("padding:9px 18px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#7A7A7A")}>EQUIPO</div>
                        <div style={css("padding:9px 10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#7A7A7A;text-align:right")}>INICIO</div>
                        <div style={css("padding:9px 10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#7A7A7A;text-align:right")}>FIN</div>
                        <div style={css("padding:9px 10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#7A7A7A;text-align:right")}>HS MARCHA</div>
                        <div style={css("padding:9px 18px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#7A7A7A")}>COMENTARIOS</div>
                      </div>
                      {p.equipos.map((e, j) => (
                        <div key={j} style={css("display:grid;grid-template-columns:150px 90px 90px 100px 1fr;border-bottom:1px solid #F1F1F1;align-items:start")}>
                          <div style={css("padding:12px 18px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#1F1F1F")}>{e.equipo}</div>
                          <div style={css("padding:12px 10px;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;color:#3A3A3A")}>{e.inicio}</div>
                          <div style={css("padding:12px 10px;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;color:#3A3A3A")}>{e.fin}</div>
                          <div style={css("padding:12px 10px;font-size:14px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums")}>{e.marcha}</div>
                          <div style={css("padding:12px 18px;font-size:13.5px;color:#3A3A3A;line-height:1.5;text-wrap:pretty")}>{e.comentario}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={vm.goNovProdNew} className="hov-blue" style={css("width:100%;min-height:48px;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer")}>+ Agregar novedad</button>
            </div>
          )}

          {vm.isNovProdNew && (
            <div style={css("background:#fff;border:1px solid #E1E1E1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;max-width:1000px;width:100%;margin:0 auto")}>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px")}>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Fecha
                  <input type="date" value={vm.npFecha} onChange={vm.setNpFecha} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Turno
                  <select value={vm.npTurno} onChange={vm.setNpTurno} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="MAÑANA">Mañana</option>
                    <option value="NOCHE">Noche</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Clima
                  <select value={vm.npClima} onChange={vm.setNpClima} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="SOLEADO">Soleado</option>
                    <option value="NUBLADO">Nublado</option>
                    <option value="HUMEDAD">Humedad</option>
                    <option value="LLUVIA">Lluvia</option>
                    <option value="VIENTO">Viento</option>
                    <option value="NIEVE">Nieve</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Equipo
                  <select value={vm.npEquipo} onChange={vm.setNpEquipo} style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")}>
                    <option value="IMPACTOR">Impactor</option>
                    <option value="ZARANDA 01">Zaranda 01</option>
                    <option value="ZARANDA 02">Zaranda 02</option>
                  </select>
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Hs de inicio de turno
                  <input type="number" value={vm.npIni} onChange={vm.setNpIni} placeholder="0" style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
                <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Hs de fin de turno
                  <input type="number" value={vm.npFin} onChange={vm.setNpFin} placeholder="0" style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;background:#fff")} />
                </label>
              </div>
              <label style={css("display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#5C5C5C")}>Comentarios
                <textarea rows={3} value={vm.npTexto} onChange={vm.setNpTexto} placeholder="Ej: Pala fuera de servicio 3 hs por cambio de manguera hidráulica" style={css("width:100%;padding:12px;border:1px solid #D9D9D9;border-radius:8px;font-size:16px;font-family:inherit;background:#fff;resize:vertical")} />
              </label>
              <div style={css("display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #EDEDED;padding-top:14px")}>
                <button onClick={vm.goNovProd} className="hov-outline" style={css("flex:1 1 140px;min-height:48px;border:1px solid #C9C9C9;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer")}>Cancelar</button>
                <button onClick={vm.saveNovProd} className="hov-dark" style={css("flex:1 1 140px;min-height:48px;border:none;border-radius:8px;color:#FFE500;font-size:16px;font-weight:600;cursor:pointer")}>Enviar</button>
              </div>
            </div>
          )}

        </main>

        {vm.showBottomNav && (
          <nav style={css("position:sticky;bottom:0;z-index:20;background:#111;border-top:3px solid #FFE500")}>
            <div style={css("max-width:1440px;margin:0 auto;display:grid;grid-template-columns:repeat(5,1fr)")}>
              <button onClick={vm.goHome} className="hov-nav" style={css("min-height:58px;border:none;color:#F2F2F2;font-size:12px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>
                Inicio
              </button>
              <button onClick={vm.goDespachos} className="hov-nav" style={css("min-height:58px;border:none;color:#F2F2F2;font-size:12px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h9v9H2z"></path><path d="M11 11h5l3 3v2h-8z"></path><circle cx="6" cy="18" r="2"></circle><circle cx="16" cy="18" r="2"></circle></svg>
                Despachos
              </button>
              <button onClick={vm.goProduccion} className="hov-nav" style={css("min-height:58px;border:none;color:#F2F2F2;font-size:12px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 19h20"></path><path d="M3 19l6-9 4 5 2-2.5L21 19"></path></svg>
                Producción
              </button>
              <button onClick={vm.goKpiAluv} className="hov-nav" style={css("min-height:58px;border:none;color:#F2F2F2;font-size:12px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V4"></path><path d="M3 20h18"></path><rect x="7" y="12" width="3" height="6"></rect><rect x="12" y="8" width="3" height="10"></rect><rect x="17" y="5" width="3" height="13"></rect></svg>
                Tableros
              </button>
              <button onClick={vm.goNovedades} className="hov-nav" style={css("min-height:58px;border:none;color:#F2F2F2;font-size:12px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z"></path><path d="M9.5 22h5"></path></svg>
                Novedades CMASS
              </button>
            </div>
          </nav>
        )}
      </div>
    );
  }
}

export default App;
