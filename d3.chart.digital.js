(function () {
    d3.digital= function() {
            var height = 100,
                xValue = function (d) { return d[0]; },
                yValue = function (d) { return d[1]; },
                xScale = null, //shared time scale
                yScale = d3.scale.linear().domain([0, 1]),
                color = d3.scale.category10(),
                line = d3.svg.line().interpolate('step-after').x(X).y(Y);

            function chart(selection) {
                selection.each(function (d) {
                    var g = d3.select(this);

                    var chartConfig = this.__chart__;

                    var diGroups = _.groupBy(d.data, 'Channel');
                    var gh = height;
                    //var graphHeight = (height / _graphs.length) - gap;
                    var noChannels = _.keys(diGroups).length;
                    var yheight = gh /noChannels  - 5;
                    yScale.range([yheight, 0]);
                    var txHeight = gh / noChannels;

                    //add/update graph for each channel 
                    var i = 0;
                    _.each(diGroups, function (data, channel) {
                        if (chartConfig) {// update
                            g.select(".path." + 'di_' + channel) //update path
                                .transition().duration(600)
                                .attr("d", line(data))
                                .attr('transform', 'translate(0,' + (i * txHeight) + ')');
                            g.select(".inputLabel" + channel) //update text 
                                .transition().duration(600)
                                .attr('transform', 'translate(0,' + (i++ * txHeight + (yheight / 2)) + ')');
                        } else { // add
                            g.append("path") //add path
                                .attr('class', 'path ' + 'di_' + channel)
                                .attr("d", line(data))
                                .attr("clip-path", "url(#clip)")
                                .style('stroke', color(d.id + channel))
                                .attr('transform', 'translate(0,' + (i * txHeight) + ')');
                            g.append("svg:text")
                                .text(channel)
                                .attr('class', 'inputLabel' + channel)
                                .attr('text-anchor', 'end')
                                .attr('transform', 'translate(0,' + (i++ * txHeight + (yheight / 2)) + ')');
                        }
                    });


                    this.__chart__ = { update: true };
                });
            }

            // The x-accessor for the path generator; xScale 

            function X(d) {
                return xScale(xValue(d));
            }
            function Y(d) {
                return yScale(yValue(d));
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
            chart.y = function (_) { // provide a function which would return 0 or 1
                if (!arguments.length) return yValue;
                yValue = _;
                return chart;
            };

            chart.height = function(_) {
                if (!arguments.length) return height; 
                height = _;
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