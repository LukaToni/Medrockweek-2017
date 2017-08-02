/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(['moment', 'underscore', 'd3.chart.analog', 'd3.chart.digital', 'd3.chart.horizon'], function (moment) {

    var _container, _graphs = [];

    //chart d3 config
    var _svgContainer, _chartCanvas, _xScale, _xDomain = [Infinity, -Infinity];

    //static config
    var containerWidth = 800, containerHeight = 400;
    var margin = { top: 40, right: 50, bottom: 30, left: 60 },
    width = containerWidth - margin.left - margin.right,
    height = containerHeight - margin.top - margin.bottom;
    var logChartHeight = 100, diChartHeight = 20;
    var gap = 30;
    var color = d3.scale.category10();

    this.init = function (options) {
        _container = options.container;
        containerWidth = $(_container).width();
        width = containerWidth - margin.left - margin.right;

        _svgContainer = d3.select(_container)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        _svgContainer.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        _chartCanvas = _svgContainer
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // set up the X Axis scale
        _xScale = d3.time.scale().range([0, width]);
       
        var hoverLine = _chartCanvas.append('svg:line')
            .attr('class', 'hover-line')
            .attr('x1', 20).attr('x2', 20)
            .attr('y1', 2)// prevent touching x-axis line
            .attr('y2', height + 20)
            .attr('transform', 'translate(0, -20)')
            .attr('stroke-width', 1)
            .attr('stroke', 'grey')
            .attr('opacity', 1e-6);

        _chartCanvas.append("g")
            .attr('id', 'xAxis')
            .attr('transform', 'translate(0, -20)') // putting x-Axis into the margin area
            .attr("class", "brush");
        _chartCanvas.select('#xAxis').append('g')// where x-axis will be rendered
            .attr("class", "x axis");
        
        
        var timeLegend = _chartCanvas.append('text')
            .attr('class', 'legend-time')
            .attr('x', width)
            .attr('y', -5) // push to the margin area below x-axis
            .attr('text-anchor', 'end')
            .text('time:');
        

        _svgContainer// mouse event not working on _chartCanvas
            .on('mouseover', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;
                if (mX > 0 && mY > 0 && mX < width)                    
                    hoverLine.style('opacity', 1);                
                else
                    hoverLine.style("opacity", 1e-6);
            })
            .on('mouseout', function () {
                hoverLine.style("opacity", 1e-6);
            })
            .on('mousemove', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;
                hoverLine.attr('x1', mX).attr('x2', mX);
                if (mX > 0 && mY > 0 && mX < width) { 
                    var dt = _xScale.invert(mX);
                    var nearestDateVal = minDistanceDate(_.map(_graphs, function (d) { return d.map[mX] ? d.map[mX].date : null; }), dt);
                    var graphIdswithDataAtNearestDate = _.chain(_graphs).filter(function(d) { return d.map[mX] && d.map[mX].date == nearestDateVal; }).pluck('id').value();
                    if (nearestDateVal!=null) {
                        var xMoment = moment(nearestDateVal);
                        //update legend values 
                        d3.selectAll('.graph').data(_graphs, function (d) { return d.id; }).each(function (d) {
                            var g = d3.select(this);
                            var str = '';
                            //var v = _.findWhere(d.data, { DateTime: nearestDateVal });                            
                            if (graphIdswithDataAtNearestDate.indexOf(d.id) >= 0) {
                                var v = d.data[d.map[mX].idx];
                                _.each(d.yVal, function (yDim, i) {
                                    str += d.yVal.length == 1 ? v[yDim] : ((i > 0 ? ', ' : ' ') + yDim + ':' + v[yDim]);
                                });
                            }                            
                            g.select('.legend').text(d.id + ' : ' + str);
                        });
                        //move plot line to stick to nearest time where any value found , then update time and value legends                    
                        timeLegend.text(xMoment.format('DD MMM'));
                        var moveX = _xScale(xMoment);
                        hoverLine.attr('x1', moveX).attr('x2', moveX);
                    }                    
                } 
            });
        
    };
    
    //select and generate a chart plugin to render
    function selectChart(d) {
        if (d.type == 'analog') {
            var chart = d3.analog().height(logChartHeight).gap(gap).color(color);
        }
        else if (d.type == 'digital') {
            chart = d3.digital().height(graphHeight(d)).color(color)
                .y(function (t) { return t.State ? 1 : 0; });// 0/1 generator as y function
        }
        if (d.type == 'horizon') {
            var mean = d.data.map(function (t) { return t.Value; }).reduce(function (p, v) { return p + v; }, 0) / d.data.length;
            chart = d3.horizon()
                .width(width)
                .height(logChartHeight)
                .gap(gap)
                .y(function (t) { return t.Value - mean; })
                .bands(3)
                .mode("offset");
        }
        
        if(chart) {
            //config common features
            chart.timeScale(_xScale).x(function (t) { return moment(t.DateTime).toDate(); });
        }        

        return chart;
    }

    function graphHeight(d) {
        if (d.type == 'analog')
            return logChartHeight;
        else if (d.type == 'digital') {
            //calculate height
            var cnt = _.uniq(d.data, false, function (t) { return t.Channel; }).length;
            return diChartHeight * cnt;
        } else {
            return 100;
        }
    }
    
    function adjustChartHeight() {
        height = 0;
        _.each(_graphs, function (t) { height += graphHeight(t); });
        containerHeight = height + margin.top + margin.bottom;
        _svgContainer.attr('height', containerHeight);
        $('.loader').height(containerHeight);
        _svgContainer.select('#clip').select('rect').attr('height', height);
        _chartCanvas.select('.hover-line').attr('y2', height + 20);
    }

    //returns a date from dates array which is nearest from dt
    function minDistanceDate(dates, dt) {
        var result = null, distance = Infinity, dtVal=moment(dt).valueOf();
        _.each(dates, function(d) {
            var m = moment(d).valueOf();
            if (distance > Math.abs(m - dtVal)) {
                distance = Math.abs(m - dtVal);
                result = d;
            }                
        });
        return result;
    }


    //long running, should be non-blocking as user zooms
    function zoom(callback) {        
        //artificially spawns background task
        setTimeout(function() {
            _.each(_graphs, function (g) {
                g.map = getLookupMap(g, _xScale);
            });
            callback();
        }, 30);
    }

    //generate hashmap for fast lookup from plotline position
    function getLookupMap(graph, xScale) {
        
        //hashmap for fast lookup with mousemove (plotline)
        var map = [];
        var startIndex = _.sortedIndex(graph.data, xScale.domain()[0], function (v) { return moment(v).valueOf(); });
        var endIndex = _.sortedIndex(graph.data, xScale.domain()[1], function (v) { return moment(v).valueOf(); });
        var data = _.chain(graph.data).rest(startIndex).initial(endIndex - startIndex).value();
        
        var dates = _.map(data, function (d) { return moment(d.DateTime).valueOf(); });
        var cursorIndex = 0;// for skipping records on subsequent search
        
        _.each(d3.range(width), function (px) {
            var dt = xScale.invert(px);
            var dataIndex = cursorIndex+_.sortedIndex(_.rest(dates, cursorIndex), dt.valueOf());// assuming data is sorted
            if (dataIndex < data.length) {
                if (dataIndex > 0) {
                    var left = moment(data[dataIndex - 1].DateTime), right = moment(data[dataIndex].DateTime);
                    if (moment(dt).diff(left) < right.diff(dt)) // if left is nearer
                        dataIndex = dataIndex - 1;
                }
                map.push({ date: data[dataIndex].DateTime, idx:dataIndex });
                //map[px] = data[dataIndex].DateTime;
            }                
            cursorIndex = dataIndex;
        });
        
        
        return map;
    }



    //public methods for clients of this module
    this.addGraph = function (graph) {        
        //adjust x-axis domain
        var dates = _.map(graph.data, function (d) { return moment(d.DateTime).valueOf(); });
        var min = dates[0], max = dates[dates.length - 1], streched = false; // assuming data is sorted        
        if (min < _xDomain[0]) {
            _xDomain[0] = min;
            streched = true;
        }
        if (max > _xDomain[1]) {
            _xDomain[1] = max;
            streched = true;
        }
        if (streched) {
            _xScale.domain(_xDomain); 

            //hashmap for fast lookup with plotline
            //calculate all graphs hashmaps as x-scale changed for new graph data
            _.each(_graphs, function (g) {
                g.map = getLookupMap(g, _xScale);
            });
        }

        //setup graph data
        graph.order = _graphs.length;        

        graph.map = getLookupMap(graph, _xScale);
        _graphs.push(graph);        
        
        
        //zoom scale, this needs to be rendered here as brush event triggers render which cannot change the brush itself
        var zoomScale = d3.time.scale().range([0, width]).domain(_xScale.domain());
        var brush = d3.svg.brush()
            .x(zoomScale)
            .on('brushend', function () { 
                _xScale.domain(brush.empty() ? _xDomain : brush.extent());

                //generate lookup maps for graphs
                $('.loader').show();
                zoom(function () { render(); $('.loader').hide(); });
            });
        d3.select('#xAxis')
            .call(brush)
            .selectAll('rect')
            .attr('y', -10)
            .attr('height', 20);

        adjustChartHeight();

        if(graph.render)
            render();
    };

    this.removeGraph = function (graphId) {
        _graphs = _.reject(_graphs, function (g) { return g.id === graphId; });
        _.chain(_graphs).sortBy(function (g) { return g.order; }).each(function (g, i) { g.order = i; });
        
        adjustChartHeight();

        render();
    };

    this.reorderGraph = function (graphId, updown) { 
        var g = _.findWhere(_graphs, { id: graphId });
        if (updown == 'up') {
            var prv = _.findWhere(_graphs, { order: g.order - 1 });
            g.order = g.order > 0 ? (g.order - 1) : 0;
            if (prv)
                prv.order++; 
        }
        else if (updown === 'down') {
            var next = _.findWhere(_graphs, { order: g.order + 1 });
            g.order++;
            if (next)
                next.order--;
        }

        render();
    };
    
    //rendering with d3
    this.render = function () {

        //data-bind
        var graphs = _chartCanvas.selectAll('.graph')
            .data(_graphs, function (d) { return d.id; });

        //x-axis
        var xAxis = d3.svg.axis().scale(_xScale).orient("top").ticks(5);
        d3.select('.x.axis').call(xAxis);

        //remove graph
        graphs.exit().remove();

        //update existing graphs 
        graphs.each(function (d) {
            var g = d3.select(this);
            //position graph
            var tx = 0;
            _.chain(_graphs).filter(function (t) { return t.order < d.order; }).each(function (t) { tx += graphHeight(t); });
            g.transition().duration(700).attr('transform', function (d) { return 'translate(0, ' + tx + ')'; });

            g.call(selectChart(d));
        });

        //add new graphs 
        var newGraphs = graphs
            .enter()
            //.append('g')
            .insert('g', '.hover-line') //make hover-line on top
            .attr('class', 'graph')
            .attr('transform', function (d) {
                var tx = 0;
                _.chain(_graphs).filter(function (t) { return t.order < d.order; }).each(function (t) { tx += graphHeight(t); });
                return 'translate(0, ' + tx + ')';
            });
        newGraphs.each(function (d) { d3.select(this).call(selectChart(d)); });
    };

    return this;
});