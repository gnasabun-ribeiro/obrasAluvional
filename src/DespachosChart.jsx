import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function DespachosTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #E1E1E1", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2, color: "#2A2A2A" }}>{p.dia}</div>
      <div style={{ color: "#1E9BF0" }}>{p.tn.toLocaleString("es-AR", { maximumFractionDigits: 1 })} tn</div>
      <div style={{ color: "#6B6B6B" }}>{p.viajes} viajes</div>
    </div>
  );
}

// Sólo etiqueta picos, valles y tramos en 0 (marcados en showLabel) para no saturar el gráfico
// con un número por cada hora — así se ve la cantidad exacta en las puntas y quedan resaltados
// los tramos sin cargas.
function PeakLabel({ x, y, value, index, data }) {
  if (!data[index] || !data[index].showLabel) return null;
  return (
    <text x={x} y={y - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1668B0">
      {Math.round(value).toLocaleString("es-AR")}
    </text>
  );
}

// Los datos vienen agrupados por fecha+hora (una fila por hora), pero el eje sólo debe mostrar
// una etiqueta por día — dayTicks trae los índices donde empieza cada día.
export default function DespachosChart({ data, dayTicks, height }) {
  const tickLabel = new Map((dayTicks || []).map((t) => [t.idx, t.label]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="despachosFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1E9BF0" stopOpacity={0.55} />
            <stop offset="95%" stopColor="#1E9BF0" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
        <XAxis
          dataKey="idx"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={(dayTicks || []).map((t) => t.idx)}
          tickFormatter={(idx) => tickLabel.get(idx) || ""}
          tick={{ fontSize: 11, fill: "#6B6B6B" }}
          axisLine={{ stroke: "#E1E1E1" }}
          tickLine={false}
        />
        <YAxis width={42} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
        <Tooltip content={<DespachosTooltip />} />
        <Area type="monotone" dataKey="tn" stroke="#1E9BF0" strokeWidth={2} fillOpacity={1} fill="url(#despachosFill)" isAnimationActive={false}>
          <LabelList dataKey="tn" content={(props) => <PeakLabel {...props} data={data} />} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
