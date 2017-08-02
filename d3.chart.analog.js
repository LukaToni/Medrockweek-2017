(function () {
    d3.analog= function() {
            var height = 100, gap=10,
                xValue = function(d) { return d[0]; },
                xScale = null,
                color = d3.scale.category10();

            function chart(selection) {
                selection.each(function(d) {
                    var g = d3.select(this);
                    var chartConfig = this.__chart__;

                    if (chartConfig) {
                        var yDomain = chartConfig.yDomain;
                        var y = chartConfig.y;
                    } else {
                        var minY = _.min(d.data, function(v) {
                            return _.chain(d.yVal).map(function(c) { return v[c]; }).min().value();
                        });
                        var maxY = _.max(d.data, function(v) {
                            return _.chain(d.yVal).map(function(c) { return v[c]; }).max().value();
                        });
                        minY = _.chain(d.yVal).map(function(c) { return minY[c]; }).min().value();
                        maxY = _.chain(d.yVal).map(function(c) { return maxY[c]; }).max().value();
                        yDomain = [minY, maxY];

                        y = d3.scale.linear().domain(yDomain).range([height - gap, 0]);
                        var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);
                        g.attr('id', d.id) // add y axis
                            .append('g')
                            .attr("class", "y axis")
                            .attr('transform', 'translate(-1, 0)') // avoid making the vertical line disappear by clip when zoomed with brush
                            .call(yAxis);
                    }

                    //add path for each y-Value dimension 
                    _.each(d.yVal, function(c, i) {
                        //setup line function
                        var valueline = d3.svg.line()
                            //.interpolate('basis')
                            //.x(function (a) { return xScale(moment(a.DateTime).toDate()); })
                            .x(X)
                            .y(function (a) { return y(a[c]); });

                        if (chartConfig) {
                            g.select(".path." + c).transition().duration(1000) //update path
                                .attr("d", valueline(d.data));
                        } else {                            
                            g.append("path") //add path 
                                .attr('class', 'path ' + c)
                                .attr("d", valueline(d.data))
                                .attr("clip-path", "url(#clip)")
                                .style('stroke', color(d.id + i));
                            //add legend
                            g.append('text').text(d.name)
                                .attr('class', 'legend')
                                .attr('x', 10).attr('y', 10);
                        }
                    });


                    //stash chart settings for update
                    this.__chart__ = { yDomain: yDomain, y: y };
                });
            }

            // The x-accessor for the path generator; xScale 

            function X(d) {
                return xScale(xValue(d));
            }

            chart.timeScale = function(_) {
                if (!arguments.length) return xScale;
                xScale = _;
                return chart;
            };

            chart.x = function(_) {
                if (!arguments.length) return xValue;
                xValue = _;
                return chart;
            };

            chart.height = function(_) {
                if (!arguments.length) return height;
                height = _;
                return chart;
            };
            chart.gap = function (_) {
                if (!arguments.length) return gap;
                gap = _;
                return chart;
            };

            chart.color = function(_) {
                if (!arguments.length) return color;
                color = _;
                return chart;
            };
        

            return chart;    
    };
        
})();