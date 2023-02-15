const path = require('path')
const fs = require("fs")

const mode = "development";
const tsRule = {
  test: /\.tsx?$/,
  use: 'ts-loader',
  exclude: /node_modules/,
}; 


function packStyle(style) {
  console.log(`${(new Date).toTimeString()}: packing ${style}`);
  
  const sourceRoot = path.resolve(__dirname,'source','web','styles',style);
  
  let html = fs.readFileSync(path.join(sourceRoot, 'index.html'), 'utf8');
  let js = ''; 
  let sharedcss = fs.readFileSync(path.join(__dirname,'source','web','shared.css'), 'utf8');
  let css = fs.readFileSync(path.join(sourceRoot,'main.css'), 'utf8');
  let images = [];
  
  js += '\nwindow.assets = {\n';
  const mimes = {
    ".png": 'image/png',
    ".jpg": 'image/jpg',
    ".ogg": 'audio/ogg',
    ".mp3": 'audio/mp3'
  }
  for ( let name of fs.readdirSync(sourceRoot))
  {
    const ext = path.extname(name);
    if ( Object.keys(mimes).indexOf(ext) < 0 ) { continue; }
    var bitmap = fs.readFileSync(path.join(sourceRoot,name));
    js += `'${name}': "data:${mimes[ext]};base64,` + Buffer.from(bitmap).toString('base64') + '",\n';
  }
  js += '};\n'
  js += fs.readFileSync(path.join(sourceRoot,'bundle.js'), 'utf8');
  
  let cssLines = css.split('\n');
  let imports = cssLines.filter( (l) => l.indexOf("@import") >= 0 );
  cssLines = cssLines.filter( (l) => l.indexOf("@import") < 0 );
  css = cssLines.join(' ');
  imports = imports.join(' ');
  
  html = html.replace('<!--SCRIPT-->', '<script>'+js+'</script>');
  html = html.replace('<!--SYTLE-->', '<style>'+[imports,sharedcss,css].join(' ')+'</style>');
            
  fs.writeFileSync(path.resolve(__dirname,'skill-package','assets',`index_${style}.html`), html);
  console.log(`${(new Date).toTimeString()}: ${style} packing complete`);
}


const styles = ["typewriter", "minimal", "template", "hacker"];

const webTask = {
  mode,
  //entry: path.join(__dirname,'source','web','index.ts'),
  output: {
    path: path.join(__dirname,'source','web','styles'),
    filename: '[name]/bundle.js'
  },
  module: { rules: [ tsRule ], },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) =>{
          styles.forEach( s => packStyle(s) );
        })
      }
    }
  ],
  watchOptions: {
    ignored: ['**/node_modules'],
  }
};

webTask.entry = {}

styles.forEach( style => {
  webTask.entry[style] = path.join(__dirname,'source','web','styles',style,'index.ts');
});



const lambaTask = {
  mode,
  entry: path.join(__dirname,'source','lambda','index.ts'),
  target: "node",
  output: {
    path: path.join(__dirname,'lambda'),
    filename: "game.js",
    library: {
      type: 'commonjs-module'
    } 
  },
  module: { rules: [ tsRule ], },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  plugins: [],
  externals: ['ask-sdk-core']
}


module.exports = [ lambaTask, webTask ];