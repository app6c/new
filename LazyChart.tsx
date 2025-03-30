import React from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, ResponsiveContainer
} from 'recharts';

interface ChartData {
  name: string;
  valor: number;
  color: string;
}

interface LazyChartProps {
  type: 'bar' | 'pie' | 'ambition' | 'dependency';
  data: ChartData[];
  height?: number;
}

// Componente otimizado para carregar os gráficos de forma lazy
const LazyChart: React.FC<LazyChartProps> = ({ type, data, height = 250 }) => {
  if (type === 'bar') {
    return (
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        width={500}
        height={height}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(value) => `${value}%`} />
        <YAxis dataKey="name" type="category" width={100} />
        <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
        <Bar dataKey="valor" name="Percentual">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  if (type === 'pie') {
    return (
      <PieChart width={500} height={height}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, value }) => `${name}: ${value}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="valor"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
      </PieChart>
    );
  }

  if (type === 'ambition') {
    // Encontrar valores de Líder e Competitivo (com a primeira letra maiúscula como no chartData)
    const liderPattern = data.find(item => item.name === 'Líder');
    const competitivoPattern = data.find(item => item.name === 'Competitivo');
    
    // Calcular a média: Ambição (%) = (Percentual de LÍDER + COMPETITIVO) / 2
    const liderValue = liderPattern?.valor || 0;
    const competitivoValue = competitivoPattern?.valor || 0;
    const ambitionValue = (liderValue + competitivoValue) / 2;
    const roundedAmbitionValue = Math.round(ambitionValue * 10) / 10; // Arredondar para 1 casa decimal
    
    // Dados para o gráfico de ambição
    const ambitionData = [
      {
        name: 'Ambição',
        valor: roundedAmbitionValue,
        color: '#2563eb' // Cor azul para representar ambição
      }
    ];
    
    return (
      <div className="flex flex-col items-center">
        {/* Display only the result */}
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {roundedAmbitionValue}%
          </div>
        </div>
        
        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={height - 60}>
          <BarChart
            data={ambitionData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
            <Bar dataKey="valor" fill="#2563eb" name="Percentual">
              {ambitionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'dependency') {
    // Encontrar valores de Conectivo e Forte (com a primeira letra maiúscula como no chartData)
    const conectivoPattern = data.find(item => item.name === 'Conectivo');
    const fortePattern = data.find(item => item.name === 'Forte');
    
    // Calcular a média: Dependência (%) = (Percentual de Conectivo + Forte) / 2
    const conectivoValue = conectivoPattern?.valor || 0;
    const forteValue = fortePattern?.valor || 0;
    const dependencyValue = (conectivoValue + forteValue) / 2;
    const roundedDependencyValue = Math.round(dependencyValue * 10) / 10; // Arredondar para 1 casa decimal
    
    // Dados para o gráfico de dependência
    const dependencyData = [
      {
        name: 'Dependência',
        valor: roundedDependencyValue,
        color: '#ec4899' // Cor rosa para representar dependência emocional
      }
    ];
    
    return (
      <div className="flex flex-col items-center">
        {/* Display only the result */}
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold text-pink-500">
            {roundedDependencyValue}%
          </div>
        </div>
        
        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={height - 60}>
          <BarChart
            data={dependencyData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
            <Bar dataKey="valor" fill="#ec4899" name="Percentual">
              {dependencyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default LazyChart;