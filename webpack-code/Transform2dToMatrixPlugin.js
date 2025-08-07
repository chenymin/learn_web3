const fs = require('fs');
const path = require('path');

/**
 * Transform2D to Matrix Webpack Plugin
 * 将 CSS 中的 2D Transform 转换为矩阵形式以提升 GPU 加速性能
 */
class Transform2dToMatrixPlugin {
  constructor(options = {}) {
    this.options = {
      // 是否在开发模式下启用
      enableInDev: options.enableInDev || false,
      // 要处理的文件扩展名
      test: options.test || /\.css$/,
      // 是否保留原始注释
      preserveComments: options.preserveComments !== false,
      // 自定义输出日志
      verbose: options.verbose || false,
      ...options
    };
  }

  apply(compiler) {
    const pluginName = 'Transform2dToMatrixPlugin';

    // 在生成资源阶段处理文件
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      // 检查是否在开发模式
      if (compiler.options.mode === 'development' && !this.options.enableInDev) {
        return callback();
      }

      let processedFiles = 0;
      let transformedRules = 0;

      // 遍历所有输出资源
      Object.keys(compilation.assets).forEach(filename => {
        if (this.options.test.test(filename)) {
          const asset = compilation.assets[filename];
          const originalContent = asset.source();
          
          try {
            const { content: processedContent, transformCount } = this.processCssContent(originalContent);
            
            if (transformCount > 0) {
              // 更新资源内容
              compilation.assets[filename] = {
                source: () => processedContent,
                size: () => processedContent.length
              };
              
              processedFiles++;
              transformedRules += transformCount;
              
              if (this.options.verbose) {
                console.log(`✅ ${filename}: 转换了 ${transformCount} 个 transform 规则`);
              }
            }
          } catch (error) {
            compilation.errors.push(
              new Error(`Transform2dToMatrix 处理 ${filename} 时出错: ${error.message}`)
            );
          }
        }
      });

      if (this.options.verbose && processedFiles > 0) {
        console.log(`🚀 Transform2D to Matrix: 处理了 ${processedFiles} 个文件，转换了 ${transformedRules} 个规则`);
      }

      callback();
    });
  }

  /**
   * 处理 CSS 内容
   */
  processCssContent(content) {
    let transformCount = 0;
    
    // 匹配 transform 属性的正则表达式
    const transformRegex = /(\s*)(transform\s*:\s*)([\s\S]*?)(;|\})/g;
    
    const processedContent = content.replace(transformRegex, (match, indent, property, value, terminator) => {
      const trimmedValue = value.trim();
      
      // 跳过已经是 matrix 的值
      if (trimmedValue.startsWith('matrix(')) {
        return match;
      }
      
      try {
        const matrixValue = this.convertToMatrix(trimmedValue);
        if (matrixValue && matrixValue !== trimmedValue) {
          transformCount++;
          
          let result = `${indent}${property}${matrixValue}${terminator}`;
          
          // 如果启用了注释保留，添加原始值注释
          if (this.options.preserveComments) {
            result = `${indent}/* Original: transform: ${trimmedValue}; */\n${result}`;
          }
          
          return result;
        }
      } catch (error) {
        console.warn(`警告: 无法转换 transform 值 "${trimmedValue}": ${error.message}`);
      }
      
      return match;
    });
    
    return { content: processedContent, transformCount };
  }

  /**
   * 将 transform 函数转换为 matrix
   */
  convertToMatrix(transformValue) {
    // 如果是 none 或空值，直接返回
    if (!transformValue || transformValue === 'none') {
      return transformValue;
    }

    // 解析 transform 函数
    const functions = this.parseTransformFunctions(transformValue);
    
    if (functions.length === 0) {
      return transformValue;
    }

    // 计算最终的变换矩阵
    let resultMatrix = this.createIdentityMatrix();
    
    for (const func of functions) {
      const matrix = this.functionToMatrix(func);
      if (matrix) {
        resultMatrix = this.multiplyMatrices(resultMatrix, matrix);
      }
    }
    
    // 转换为 CSS matrix 字符串
    return this.matrixToString(resultMatrix);
  }

  /**
   * 解析 transform 函数字符串
   */
  parseTransformFunctions(transformValue) {
    const functions = [];
    const regex = /(\w+)\s*\(\s*([^)]*)\s*\)/g;
    let match;
    
    while ((match = regex.exec(transformValue)) !== null) {
      const [, name, params] = match;
      const values = params.split(',').map(v => v.trim()).filter(v => v);
      functions.push({ name, values });
    }
    
    return functions;
  }

  /**
   * 将单个 transform 函数转换为矩阵
   */
  functionToMatrix(func) {
    const { name, values } = func;
    
    switch (name.toLowerCase()) {
      case 'translate':
        return this.translateMatrix(
          this.parseValue(values[0] || '0'),
          this.parseValue(values[1] || '0')
        );
      
      case 'translatex':
        return this.translateMatrix(this.parseValue(values[0] || '0'), 0);
      
      case 'translatey':
        return this.translateMatrix(0, this.parseValue(values[0] || '0'));
      
      case 'scale':
        const scaleX = this.parseValue(values[0] || '1');
        const scaleY = this.parseValue(values[1] || values[0] || '1');
        return this.scaleMatrix(scaleX, scaleY);
      
      case 'scalex':
        return this.scaleMatrix(this.parseValue(values[0] || '1'), 1);
      
      case 'scaley':
        return this.scaleMatrix(1, this.parseValue(values[0] || '1'));
      
      case 'rotate':
        return this.rotateMatrix(this.parseAngle(values[0] || '0'));
      
      case 'skew':
        return this.skewMatrix(
          this.parseAngle(values[0] || '0'),
          this.parseAngle(values[1] || '0')
        );
      
      case 'skewx':
        return this.skewMatrix(this.parseAngle(values[0] || '0'), 0);
      
      case 'skewy':
        return this.skewMatrix(0, this.parseAngle(values[0] || '0'));
      
      default:
        return null;
    }
  }

  /**
   * 解析数值（处理 px、%、em 等单位）
   */
  parseValue(value) {
    // 对于 transform，大部分数值单位会被忽略，除了百分比和一些特殊情况
    const numericValue = parseFloat(value);
    return isNaN(numericValue) ? 0 : numericValue;
  }

  /**
   * 解析角度值
   */
  parseAngle(value) {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 0;
    
    // 转换为弧度
    if (value.includes('rad')) {
      return numericValue;
    } else if (value.includes('grad')) {
      return numericValue * Math.PI / 200;
    } else if (value.includes('turn')) {
      return numericValue * 2 * Math.PI;
    } else {
      // 默认为度数
      return numericValue * Math.PI / 180;
    }
  }

  /**
   * 创建单位矩阵
   */
  createIdentityMatrix() {
    return [1, 0, 0, 1, 0, 0];
  }

  /**
   * 创建平移矩阵
   */
  translateMatrix(x, y) {
    return [1, 0, 0, 1, x, y];
  }

  /**
   * 创建缩放矩阵
   */
  scaleMatrix(x, y) {
    return [x, 0, 0, y, 0, 0];
  }

  /**
   * 创建旋转矩阵
   */
  rotateMatrix(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [cos, sin, -sin, cos, 0, 0];
  }

  /**
   * 创建倾斜矩阵
   */
  skewMatrix(angleX, angleY) {
    return [1, Math.tan(angleY), Math.tan(angleX), 1, 0, 0];
  }

  /**
   * 矩阵相乘
   */
  multiplyMatrices(a, b) {
    return [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5]
    ];
  }

  /**
   * 将矩阵转换为 CSS 字符串
   */
  matrixToString(matrix) {
    // 四舍五入到合理的精度
    const rounded = matrix.map(val => {
      const num = Number(val);
      return Math.abs(num) < 1e-10 ? 0 : Math.round(num * 1e6) / 1e6;
    });
    
    return `matrix(${rounded.join(', ')})`;
  }
}

module.exports = Transform2dToMatrixPlugin;