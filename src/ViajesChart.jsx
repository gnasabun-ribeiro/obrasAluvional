import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ViajesTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #E1E1E1", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2, color: "#2A2A2A" }}>{label}</div>
      <div style={{ color: p.finde ? "#2A2A2A" : "#C99400" }}>{p.viajes.toLocaleString("es-AR")} viajes</div>
      <div style={{ color: "#6B6B6B" }}>{p.finde ? "Fin de semana" : "Día hábil"}</div>
    </div>
  );
}

// Sólo etiqueta picos, valles y tramos en 0 (marcados en showLabel) para no saturar el gráfico
// con un número por cada día — así se ve la cantidad exacta en las puntas.
function PeakLabel({ x, y, width, value, index, data }) {
  if (!data[index] || !data[index].showLabel) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill="#8A6D00">
      {Math.round(value).toLocaleString("es-AR")}
    </text>
  );
}

export default function ViajesChart({ data, referencia, height }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6B6B6B" }} minTickGap={24} axisLine={{ stroke: "#E1E1E1" }} tickLine={false} />
        <YAxis
          width={46}
          tick={{ fontSize: 11, fill: "#6B6B6B" }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Recuento de Nro de guía", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 11, fill: "#6B6B6B" } }}
        />
        <Tooltip content={<ViajesTooltip />} cursor={{ fill: "#FFF6DB" }} />
        <ReferenceLine
          y={referencia}
          stroke="#3F86C9"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          label={{ value: referencia, position: "right", fill: "#3F86C9", fontSize: 11, fontWeight: 600 }}
        />
        <Bar dataKey="viajes" radius={[1, 1, 0, 0]} minPointSize={2} isAnimationActive={false}>
          <LabelList dataKey="viajes" content={(props) => <PeakLabel {...props} data={data} />} />
          {data.map((d, i) => (
            <Cell key={i} fill={d.finde ? "#2A2A2A" : "#FFC800"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
