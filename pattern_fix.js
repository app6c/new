const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'client/src/pages/AnalysisKeyTurn.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// Nova lógica para considerar padrões que somam mais de 50% e são significativos
const newLogic = `    // Sempre começamos com o padrão primário e incluímos padrões que somam mais de 50%
    // E também incluímos padrões significativos (>15%)
    
    // Se o padrão primário já tiver mais de 50%, ainda podemos incluir o secundário 
    // se ele for significativo (mais de 15%)
    if (primaryPercentage >= 50) {
      // Adicionamos o secundário se for significativo
      if (secondaryPercentage >= 15) {
        patternsToConsider.push(secondaryPattern);
        totalPercentage += secondaryPercentage;
        
        // Mesmo se já tivermos mais de 50%, podemos adicionar o terciário
        // se ele for significativo
        if (tertiaryPercentage >= 15) {
          patternsToConsider.push(tertiaryPattern);
          totalPercentage += tertiaryPercentage;
        }
      }
    } 
    // Se o primário não alcançar 50%, adicionamos outros padrões até chegar a 50%
    else if (secondaryPercentage > 0) {
      patternsToConsider.push(secondaryPattern);
      totalPercentage += secondaryPercentage;
      
      // Se ainda não chegarmos a 50%, adicionamos o terciário
      if (totalPercentage < 50 && tertiaryPercentage > 0) {
        patternsToConsider.push(tertiaryPattern);
        totalPercentage += tertiaryPercentage;
      }
      // Se já chegamos a 50% e o terciário for significativo, também o incluímos
      else if (totalPercentage >= 50 && tertiaryPercentage >= 15) {
        patternsToConsider.push(tertiaryPattern);
        totalPercentage += tertiaryPercentage;
      }
    }`;

// Padrão a ser substituído
const oldPattern = /\s+\/\/ Se o padrão primário já tiver mais de 50%, mantemos apenas ele\s+if \(primaryPercentage >= 50\) {\s+\/\/ Já temos padrão suficiente com o primário apenas\s+}\s+\/\/ Caso contrário, adicionamos o secundário se ele existir e tiver um valor\s+else if \(secondaryPercentage > 0\) {\s+patternsToConsider\.push\(secondaryPattern\);\s+totalPercentage \+= secondaryPercentage;\s+\s+\/\/ Se a soma dos dois primeiros não chegar a 50%, adicionamos o terciário\s+if \(totalPercentage < 50 && tertiaryPercentage > 0\) {\s+patternsToConsider\.push\(tertiaryPattern\);\s+totalPercentage \+= tertiaryPercentage;\s+}\s+}/g;

// Substitui todas as ocorrências
content = content.replace(oldPattern, newLogic);

// Escreve o arquivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('Arquivo atualizado com sucesso!');
