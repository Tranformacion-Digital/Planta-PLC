/*-------------------------------------
Creacion de variables para las graficas
-------------------------------------*/

//Variables para los objetos de graficas
let Pline = null;
let Gauge1 = null;

//Variables para los datos
let data_line = [];

//Obtener los canvas
canvas1 = document.getElementById("cvs_line");

const numvalues = 1000;
for(let i=0; i<numvalues; ++i){
    data_line.push(null);
}

/*---------------------------------------------------
Se utiliza la funcion onload para crear o inicializar
las graficas cuando se carga la pagina
---------------------------------------------------*/
window.onload = function(){
    //Parametrizar la grafica
    Pline = new RGraph.Line({
        id: 'cvs_line',
        data: data_line,
        options: {
            //xaxisLabels: ['Aug 13, 2012','Sep 9 2013','Oct 6 2014'],
            marginLeft: 75,
            marginRight: 55,
            filled: true,
            filledColors: ['#C2D1F0'],
            colors: ['#3366CB'],
            shadow: false,
            tickmarksStyle: null,
            xaxisTickmarksCount: 0,
            backgroundGridVlines: false,
            backgroundGridBorder: false,
            xaxis: false,
            textSize: 16
        }
    }).draw();

    Gauge1 = new RGraph.Gauge({
        id: 'cvs_gauge',
        min: -10,
        max: 25,
        value: 19,
        options: {
            centery: 120,
            radius: 130,
            anglesStart: RGraph.PI,
            anglesEnd: RGraph.TWOPI,
            needleSize: 85,
            borderWidth: 0,
            shadow: false,
            needleType: 'line',
            colorsRanges: [[-10,-5,'#000099'], [-5,8,'#0000FF'], [8,15,'#0099FF'],[15,20,'#FFCC33'],[20,25,'#FF6633']],
            borderInner: 'rgba(0,0,0,0)',
            borderOuter: 'rgba(0,0,0,0)',
            borderOutline: 'rgba(0,0,0,0)',
            centerpinColor: 'rgba(0,0,0,0)',
            centerpinRadius: 0
        }
    }).grow();
}

/*-----------------------------------------------
Funciones necesarias para actualizar las graficas
-----------------------------------------------*/

function drawLine(value){
    if(!Pline){return}
    RGraph.Clear(canvas1);
    data_line.push(value);

    if(data_line.length > numvalues){
        data_line = RGraph.arrayShift(data_line); //Esto descarta el primer valor del arreglo
    }

    Pline.original_data[0] = data_line;
    Pline.draw();
}

/*----------------------------------
Conectar al socket y leer el mensaje
----------------------------------*/

//Conexion
const socket = io.connect('http://localhost:3700');

socket.on("reactor", function (dataValue){
    drawLine(dataValue.value);
    //Gauge1.value = dataValue.value;
    //Gauge1.grow();
});

socket.on("chiller", function (dataValue){
    //drawLine(dataValue.value);
    Gauge1.value = dataValue.value;
    Gauge1.grow();
});

//Atender el evento