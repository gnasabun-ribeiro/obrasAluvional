export const TITLES = {
  home: "Cargas Aluvional",
  despachos: "Registro de despachos",
  despachoNew: "Nueva carga de despacho",
  estadisticas: "Estadísticas",
  produccion: "Registro de producción",
  produccionNew: "Nueva carga de producción",
  kpiProd: "KPIs Producción",
  detalle: "KPIs Producción",
  novedades: "Novedades CMASS",
  novedadNew: "Nueva novedad CMASS",
  novProd: "Novedades de producción",
  novProdNew: "Nueva novedad de producción",
  viajes: "KPIs Aluvional",
  detalleCargas: "KPIs Aluvional",
  kpiAluv: "KPIs Aluvional"
};

export const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export const SERIE = [
  { f: "01/05", desp: 2052, prod: 5320 },
  { f: "02/05", desp: 3208, prod: 0 },
  { f: "03/05", desp: 2334, prod: 7140 },
  { f: "04/05", desp: 3448, prod: 13250 },
  { f: "05/05", desp: 2225, prod: 5600 },
  { f: "06/05", desp: 3536, prod: 0 },
  { f: "07/05", desp: 2069, prod: 7000 },
  { f: "08/05", desp: 3005, prod: 0 },
  { f: "09/05", desp: 3650, prod: 0 }
];

export const TABLERO = ["kpiAluv", "viajes", "detalleCargas", "kpiProd", "detalle"];

export const VIAJES = (function () {
  const out = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const d = new Date(2026, 3, 1);
  for (let i = 0; i < 135; i++) {
    const dow = d.getDay();
    const finde = dow === 0 || dow === 6;
    const base = 30 + rnd() * 110;
    out.push({ n: Math.round(rnd() < 0.06 ? rnd() * 8 : base), finde: finde });
    d.setDate(d.getDate() + 1);
  }
  return out;
})();

export const CARGAS = (function () {
  const out = [];
  const pesos = [33, 33, 34, 29, 33, 33, 34, 34, 29, 33, 34, 33, 33, 33, 34, 34, 32, 33, 34, 33];
  for (let i = 0; i < 20; i++) {
    out.push({
      fecha: "30/04/26",
      guia: "G12957" + String(i + 1).padStart(2, "0"),
      turno: i < 3 ? "Turno A" : "Turno B",
      por: "Mylenne Abigail Sarquis",
      carga: pesos[i]
    });
  }
  return out;
})();
