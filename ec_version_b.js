'use strict';

/* globals d3 */

var calendarHeatmap = {

  /*old settings: {
    gutter: 10,
    item_gutter: 1,
    width: 1400,
    height: 400,
    item_size: 80,
    label_padding: 40,
    max_block_height: 60,
    transition_duration: 500,
    tooltip_width: 250,
    tooltip_padding: 15	
  }*/
  
   settings: {
    gutter: 5,
    item_gutter: 1,
    width: 1000,
    height: 550,
    item_size: 30,
    label_padding: 40,
    max_block_height: 20,
    transition_duration: 500,
    tooltip_width: 250,
    tooltip_padding: 15,
  },
  
  


  /**
   * Initialize
   */
  init: function(data, container, objColorConfig, overview, handler, customType) {
	 moment.updateLocale('en', {
		week: {
			dow : 1, // Monday is the first day of the week.
		}
	});
	
    // Set calendar data
   // calendarHeatmap.data = data;
	
	calendarHeatmap.data = calendarHeatmap.parseServerData(data);
	
    // Set calendar container
    calendarHeatmap.container = container;

    // Set calendar color
    calendarHeatmap.objColorConfig = objColorConfig || '#ff4500';
    // Initialize current overview type and history
    calendarHeatmap.overview = overview || 'global';
	calendarHeatmap.customType = customType || 'month';
    calendarHeatmap.history = ['global'];
    calendarHeatmap.selected = {};
	calendarHeatmap.currDate = moment();
	
    // Set handler function
    calendarHeatmap.handler = handler;

    // No transition to start with
    calendarHeatmap.in_transition = false;

    // Create html elementsfor the calendar
    calendarHeatmap.createElements();

    // Parse data for summary details
    calendarHeatmap.parseData();

    // Draw the chart
    calendarHeatmap.drawChart();
	
  },


  /**
   * Create html elements for the calendar
   */
  createElements: function() {
    if (calendarHeatmap.container != null) {	   
      // Access container for calendar
      var container = document.getElementById(calendarHeatmap.container);
      if (!container || container.tagName != "DIV") {
        throw 'Element not found or not of type div';
      }
      if (!container.classList.contains('calendar-heatmap')) {
        //If the element being passed doesn't have the right class set then set it.
        container.classList.add('calendar-heatmap');
      }
    } else {
      // Create main html container for the calendar
      var container = document.createElement('div');
      container.className = 'calendar-heatmap';
      document.body.appendChild(container);
    }
    
    // Create svg element
    var svg = d3.select(container).append('svg')
      .attr('class', 'svg');

    // Create other svg elements
    calendarHeatmap.items = svg.append('g');
    calendarHeatmap.labels = svg.append('g');
    calendarHeatmap.buttons = svg.append('g');

    // Add tooltip to the same element as main svg
    calendarHeatmap.tooltip = d3.select(container).append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0);

    // Calculate dimensions based on available width
    var calcDimensions = function() {

      var dayIndex = Math.round((moment() - moment().subtract(1, 'year').startOf('week')) / 86400000);
      var colIndex = Math.trunc(dayIndex / 7);
      var numWeeks = colIndex + 1;
      calendarHeatmap.settings.width = 1800;//container.offsetWidth < 1350 ? 1800 : (container.offsetWidth);
      //calendarHeatmap.settings.item_size = ((calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / numWeeks - calendarHeatmap.settings.gutter);
      //calendarHeatmap.settings.height = calendarHeatmap.settings.label_padding + 7 * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter);
	  
	  calendarHeatmap.settings.item_size = ((calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / numWeeks - calendarHeatmap.settings.gutter) < 20 ? 28 : ((calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / numWeeks - calendarHeatmap.settings.gutter);
     // calendarHeatmap.settings.height = calendarHeatmap.settings.label_padding + 7 * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter);
      svg.attr('width', calendarHeatmap.settings.width)
        .attr('height', calendarHeatmap.settings.height );
		
      if (!!calendarHeatmap.data && !!calendarHeatmap.data[0].summary) {
        calendarHeatmap.drawChart();
      }
    };
    calcDimensions();

    window.onresize = function(event) {
      calcDimensions();
    };
  },


  /**
   * Parse data for summary in case it was not provided
   */
  parseData: function() {
    if (!calendarHeatmap.data) { return; }

    // Get daily summary if that was not provided
    if (!calendarHeatmap.data[0].summary) {
      calendarHeatmap.data.map(function(d) {
        var summary = d.details.reduce(function(uniques, project) {
          if (!uniques[project.name]) {
            uniques[project.name] = {
              'value': project.value,
			  'type': project.type
            };
          } else {
            uniques[project.name].value += project.value;
			uniques[project.name].type = project.type;
          }
          return uniques;
        }, {});
        var unsorted_summary = Object.keys(summary).map(function(key) {
          return {
            'name': key,
            'value': summary[key].value,
			'type': summary[key].type
          };
        });
        d.summary = unsorted_summary.sort(function(a, b) {
			return a.type - b.type || a.value - b.value;
        });
        return d;
      });
    }
  },


  /**
   * Parse data from server json
   */
  parseServerData: function(serverData) {	 
	 var objData = {};
	 for(var elem of serverData) {
		 var strTime = (elem[1]).match(/T/) ? elem[1].replaceAll(/T(\d+:)*\d+\+/ig, 'T00:00:00+') : elem[1].replaceAll(/\s(\d+:)*\d+/ig, 'T00:00:00');
		 if (!objData[strTime]) {
			 objData[strTime] = [];
		 } 
		 objData[strTime].push(elem);		
	 }	
	var result = [];
	for (var d in objData) {
		var arrDetails = [],
			total = 0,
			strToolTip = '', 
			strProjects = null;
		objData[d].forEach(function(el, idx) {
			arrDetails.push({
				'date': el[1], //(moment(el[1])).toDate(),
				'name': el[2] ,
				'value': el[4],
				'strProjects': el[0],
				'type': el[6]
			})
			strProjects =  (el[0]).match(/Public/) || (el[0]).match(/Sick/) || (el[0]).match(/Annual/) ? el[0] : strProjects;
			total += el[4];
		});
		strToolTip = (arrDetails[0].strProjects).substring((arrDetails[0].strProjects).indexOf("|") + 1, (arrDetails[0].strProjects).indexOf(":")); 
		// exception for sick/annual leave
		arrDetails.sort(function (a, b) {
		  return a.type > b.type;
		});
		result.push({
			'date': d,
			'details':arrDetails ,
			'total': total	,
			'strProjects':arrDetails.length == 1 ? arrDetails[0].strProjects : calendarHeatmap.getProjectFormattedString(arrDetails, 'strProjects'),
			'strToolTip' : arrDetails.length == 1 ? strToolTip :null,
			'type': arrDetails[0].type,
			'strWeekSummary': calendarHeatmap.getProjectFormattedString(arrDetails, 'name')			
		});
	};
	console.log(result);
	result.sort(function (a, b) {
		  return moment(a.date) - moment(b.date) ;
		});
  return result;
 
  },
  
  getProjectFormattedString: function(arrData, strType) {
	  var strToolTip = '';
	  var uniq = [];
	  arrData.forEach(function(el, idx) { 
		  if(strType  == 'name') {
			if(el.type == 1) {
				el[strType] = el.strProjects.slice(0,el.strProjects.indexOf(':'));
			}  
			if(el.type == 3) {
				el[strType] = el.strProjects.slice(el.strProjects.indexOf(':') + 1, el.strProjects.length);
			} 
		  }
		  uniq.push(el[strType]);
	  });
	  
	  var result = uniq.reduce(function(a,b){
		if (a.indexOf(b) < 0 ) a.push(b);
		return a;
	  },[]);
	  return result.toString();
  },
  
  

  /**
   * Draw the chart based on the current overview type
   */
  drawChart: function() {
    if (calendarHeatmap.overview === 'global') {
      calendarHeatmap.drawGlobalOverview();
    } else if (calendarHeatmap.overview === 'year') {
      calendarHeatmap.drawYearOverview();
    } else if (calendarHeatmap.overview === 'month') {
      calendarHeatmap.drawMonthOverview2();
    } else if (calendarHeatmap.overview === 'week') {
      calendarHeatmap.drawWeekOverview();
    } else if (calendarHeatmap.overview === 'day') {
		if (calendarHeatmap.customType === 'dayCompact') {
			calendarHeatmap.drawCompactDayOverview();
		}
		else {
			 calendarHeatmap.drawDayOverview();
		}     
    }
  },


  /**
   * Draw global overview (multiple years)
   */
  drawGlobalOverview: function() {
    // Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define start and end of the dataset
    var start = moment(calendarHeatmap.data[0].date).startOf('year');
    var end = moment(calendarHeatmap.data[calendarHeatmap.data.length - 1].date).endOf('year');
	

    // Define array of years and total values
    var year_data = d3.timeYears(start, end).map(function(d) {
      var date = moment(d);
      return {
        'date': date,
        'total': calendarHeatmap.data.reduce(function(prev, current) {
          if (moment(current.date).year() === date.year() && (current.type != 3)) {
            prev += current.total;
          }
          return prev;
        }, 0),
        'summary': function() {
          var summary = calendarHeatmap.data.reduce(function(summary, d) {
            if (moment(d.date).year() === date.year()) {
              for (var i = 0; i < d.summary.length; i++) {
                if (!summary[d.summary[i].name]) {
                  summary[d.summary[i].name] = {
                    'value': d.summary[i].value,
                  };
                } else {
                  summary[d.summary[i].name].value += d.summary[i].value;
                }
              }
            }
            return summary;
          }, {});
          var unsorted_summary = Object.keys(summary).map(function(key) {
            return {
              'name': key,
              'value': summary[key].value
            };
          });
          return unsorted_summary.sort(function(a, b) {
            return b.value - a.value;
          });
        }(),
      };
    });
		
	year_data = year_data.filter(function(itm){		
		if (moment(itm.date).year() < calendarHeatmap.currDate.year() && (itm.total == 0)) {
			return false;
          }
	  return true;
	})
	
    // Calculate max value of all the years in the dataset
    var max_value = d3.max(year_data, function(d) {
      return d.total;
    });
	
	 // Calculate max value of all the years in the dataset
    var min_value = d3.min(year_data, function(d) {
      return d.total;
    });

	
	calendarHeatmap.items.selectAll('.item-block-month').remove();
	calendarHeatmap.items.selectAll('.text').remove();
    calendarHeatmap.items.selectAll('.item-rect').remove();
	calendarHeatmap.items.selectAll('.item-rect').remove();
	calendarHeatmap.labels.selectAll('.label-monthDate').remove();
    // Define year labels and axis
    var year_labels = d3.timeYears( moment(year_data[0].date).startOf('year'), year_data.length ==1 ?  moment(year_data[0].date).endOf('year') : moment(year_data[year_data.length - 1].date).endOf('year')).map(function(d) {
      return moment(d);
    });
    var yearScale = d3.scaleBand()
      .rangeRound([0, calendarHeatmap.settings.width])
      .padding([0.05])
      .domain(year_labels.map(function(d) {
        return d.year();
      }));

    // Add global data items to the overview
    calendarHeatmap.items.selectAll('.item-block-year').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-year')
      .data(year_data)
      .enter()
      .append('rect')
      .attr('class', 'item item-block-year')
      .attr('width', function() {
        return (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / year_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function() {
        return (calendarHeatmap.settings.height - calendarHeatmap.settings.label_padding)/2;
      })
      .attr('transform', function(d) {
        return 'translate(' + yearScale(d.date.year()) + ',' + calendarHeatmap.settings.tooltip_padding * 2 + ')';
      })
	  .attr('stroke', "#292929") 
      .attr('fill', function(d) {
        var color = d3.scaleLinear()
          .range(['#fff6ed', calendarHeatmap.color || '#fff6ed'])
          .domain([-0.15 * max_value, max_value]);
        return color(d.total) || '#fff6ed';
      })
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Set in_transition flag
        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all global overview related items and labels
        calendarHeatmap.removeGlobalOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'year';
        calendarHeatmap.drawChart();
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Construct tooltip
        var tooltip_html = '';
        tooltip_html += '<div><span><strong>Total time booked:</strong></span>';
        var sec = parseInt(d.total, 10);
        var days = Math.floor(sec / 28800);
        if (days > 0) {
          tooltip_html += '<span>' + (days === 1 ? '1 day' : days + ' days') + '</span></div>';
        }
        var hours = Math.floor((sec - (days * 28800)) / 3600);
        if (hours > 0) {
          if (days > 0) {
            tooltip_html += '<div><span></span><span>' + (hours === 1 ? '1 hour' : hours + ' hours') + '</span></div>';
          } else {
            tooltip_html += '<span>' + (hours === 1 ? '1 hour' : hours + ' hours') + '</span></div>';
          }
        }
        var minutes = Math.floor((sec - (days * 28800) - (hours * 3600)) / 60);
        if (minutes > 0) {
          if (days > 0 || hours > 0) {
            tooltip_html += '<div><span></span><span>' + (minutes === 1 ? '1 minute' : minutes + ' minutes') + '</span></div>';
          } else {
            tooltip_html += '<span>' + (minutes === 1 ? '1 minute' : minutes + ' minutes') + '</span></div>';
          }
        }
		if(sec ==0) {
			tooltip_html += '<span>--</span>';
		}
        tooltip_html += '<br />';
		if (d.total == 0 ) { d.summary = []; }
        // Add summary to the tooltip
        if (d.summary.length <= 5) {
          for (var i = 0; i < d.summary.length; i++) {
            tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
            tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
          };
        } else {
          for (var i = 0; i < 5; i++) {
            tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
            tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
          };
          tooltip_html += '<br />';

          var other_projects_sum = 0;
          for (var i = 5; i < d.summary.length; i++) {
            other_projects_sum = +d.summary[i].value;
          };
          tooltip_html += '<div><span><strong>Other:</strong></span>';
          tooltip_html += '<span>' + calendarHeatmap.formatTime(other_projects_sum) + '</span></div>';
        }

        // Calculate tooltip position
        var x = yearScale(d.date.year()) + calendarHeatmap.settings.tooltip_padding * 2;
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 5)) {
          x -= 10;
        }	
		
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)/4) + calendarHeatmap.settings.tooltip_padding;
	
        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 50+ 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
      .delay(function(d, i) {
        return calendarHeatmap.settings.transition_duration * (i + 1) / 10;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });

    // Add year labels
    calendarHeatmap.labels.selectAll('.label-year').remove();
    calendarHeatmap.labels.selectAll('.label-year')
      .data(year_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-year')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d) {
        return d.year();
      })
      .attr('x', function(d) {
        return yearScale(d.year());
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function(year_label) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-year')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).year() === year_label.year()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-year')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Set in_transition flag
        calendarHeatmap.in_transition = true;

        // Set selected year to the one clicked on
        calendarHeatmap.selected = { date: d };

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all global overview related items and labels
        calendarHeatmap.removeGlobalOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'year';
        calendarHeatmap.drawChart();
      });
  },

  /**
   * Draw year overview
   */
  drawYearOverview: function() {
    // Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define start and end date of the selected year
    var start_of_year = moment(calendarHeatmap.selected.date).startOf('year');
    var end_of_year = moment(calendarHeatmap.selected.date).endOf('year');
   
   // Filter data down to the selected year
    var yearDates = calendarHeatmap.data.filter(function(d) {		
      return start_of_year <= moment(d.date) && moment(d.date) < end_of_year;
    });
		

	var year_data = calendarHeatmap.mergeMissingDates(start_of_year, end_of_year, yearDates);
	
    // Calculate max value of the year data
    var max_value = d3.max(year_data, function(d) {
      return d.total;
    });

    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height-200])
      .domain(day_labels.map(function(d) {
        return moment(d).weekday();
      }));


    var color = d3.scaleLinear()
      .range(['#ffffff', calendarHeatmap.color || '#ff4500'])
      .domain([-0.15 * max_value, max_value]);

	
	var calcItemX = function(d,i) {
      var date = moment(d.date);
      var dayIndex = Math.round((date - moment(start_of_year).startOf('week')) / 86400000);
      var colIndex = Math.trunc(dayIndex / 7);
      return colIndex * (calendarHeatmap.settings.item_size + calendarHeatmap.settings.gutter) + calendarHeatmap.settings.label_padding;
    };
    var calcItemY = function(d,i) {
      return (calendarHeatmap.settings.label_padding + moment(d.date).weekday() * (calendarHeatmap.settings.item_size + 10 + calendarHeatmap.settings.gutter)) + 10;
    };
    var calcItemSize = function(d) {
      if (max_value <= 0) { return calendarHeatmap.settings.item_size; }
	  return calendarHeatmap.settings.item_size ;// * 0.95;
      //return calendarHeatmap.settings.item_size * 0.75 + (calendarHeatmap.settings.item_size * d.total / max_value) * 0.75;
    };


	calendarHeatmap.items.selectAll('.item-block-month').remove();
	calendarHeatmap.items.selectAll('.text').remove();
    calendarHeatmap.items.selectAll('.item-rect').remove();
    calendarHeatmap.items.selectAll('.item-rect')
      .data(year_data)
      .enter()
      .append('rect')
      .attr('class', 'item item-rect')
      .style('opacity', 0)
      .attr('x', function(d, i) {
        return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2 ;
      })
      .attr('y', function(d, i) {		  
		return calcItemY(d, i) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
      })
    
      .attr('width', function(d) {
        return calcItemSize(d);
      })
      .attr('height', function(d) {
        return  calcItemSize(d);
      })
	  .attr('stroke', function(d) {
        return  d.total > 0 ? "#292929": '#ccc';
      })
      .attr('fill', function(d) {
        return  d.total > 0 ? calendarHeatmap.getColor(d.total, d) : '#fff';
      })	
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Don't transition if there is no data to show
        if (d.total === 0) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeYearOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      })
      .on('mouseover', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.total <= 0) {return;}
        // Pulsating animation
        var circle = d3.select(this);
        (function repeat() {
          circle = circle.transition()
            .duration(calendarHeatmap.settings.transition_duration)
            .ease(d3.easeLinear)
            .attr('x', function(d) {
              return calcItemX(d) - (calendarHeatmap.settings.item_size * 1.1 - calendarHeatmap.settings.item_size) / 2;
            })
            .attr('y', function(d, i) {
              return calcItemY(d, i) - (calendarHeatmap.settings.item_size * 1.1 - calendarHeatmap.settings.item_size) / 2;
            })
            .attr('width', calendarHeatmap.settings.item_size * 1.1)
            .attr('height', calendarHeatmap.settings.item_size * 1.1)
            .transition()
            .duration(calendarHeatmap.settings.transition_duration)
            .ease(d3.easeLinear)
            .attr('x', function(d) {
              return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
            })
            .attr('y', function(d, i) {
              return calcItemY(d, i) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
            })
            .attr('width', function(d) {
              return calcItemSize(d);
            })
            .attr('height', function(d) {
              return calcItemSize(d);
            })
            .on('end', repeat);
        })();

        // Construct tooltip
        var tooltip_html = '',
			strToolTip = '';
	     
		 if (d.type == 3 || d.type == 1 ) {
			 tooltip_html += '<div class="header"><strong>' + d.strProjects + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			 tooltip_html += '<div class="header"><strong>' + (d.total ? calendarHeatmap.formatTime(d.total) : 'No time') + ' booked</strong></div>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div><br>';
			  
			// Add summary to the tooltip
			for (var i = 0; i < d.summary.length; i++) {
			  if (d && d.strToolTip) {
				 strToolTip = (d.strToolTip.match(/Sick/) || d.strToolTip.match(/Annual/) || d.strToolTip.match(/Public/)) ? d.strToolTip : '';
				 tooltip_html += '<div><span><strong>' + strToolTip + '</strong></span>';
			  }  
			  tooltip_html += '<div><span><strong>' + d.summary[i].name + '</strong></span>';
			  tooltip_html += '<span>' + calendarHeatmap.formatTime(d.summary[i].value) + '</span></div>';
			};
		}
			

        // Calculate tooltip position
        var x = calcItemX(d) + calendarHeatmap.settings.item_size;
	    
        if (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 2;
        }
       // var y = this.getBoundingClientRect().top + calendarHeatmap.settings.item_size;
	   var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

		 //  var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.item_size;
        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        // Set circle radius back to what it's supposed to be
        d3.select(this).transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .attr('x', function(d) {
            return calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
          })
          .attr('y', function(d, i) {
            return calcItemY(d, i) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2;
          })
          .attr('width', function(d) {
            return calcItemSize(d);
          })
          .attr('height', function(d) {
            return calcItemSize(d);
          });

        // Hide tooltip
        calendarHeatmap.hideTooltip();
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });
	  
	calendarHeatmap.labels.selectAll('.label-monthDate').remove();
	calendarHeatmap.labels.selectAll('.label-dayDate').remove();
	
	// add day labels
	/****************************/
		var mnths = ['21/11'];
		// add text;
	  calendarHeatmap.items.selectAll('.text').remove();
	  calendarHeatmap.items.selectAll('.text')
      .data(year_data) 
      .enter()
	  .append('text')
	  .attr('class', function(d){
		  return calendarHeatmap.isCurrentMonth(d) ? 'text currMoment' : 'text'
	  })	  
	  .text(function(d, i) {
		return moment(d.date).format('DD');
	  }) 
	  .style('opacity', 1)
	  .style('fill',function(d,i) {	
		  return  d.total > 0 ? calendarHeatmap.getTextColor(d.total, d, '')  : '#bfbfbf'; //> 8 ? '#fff' : 'inherit';
	  })
	  .attr("text-anchor", "middle")
	  .attr('y', function(d, i) {
        return 12.5 + (calcItemY(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2) ;
      })
	  .attr('x', function(d, i) {
        return 10 + (calcItemX(d) + (calendarHeatmap.settings.item_size - calcItemSize(d)) / 2) ;
      });
	  
      
	  /****************************/
	  
    // Add month labels
    var month_labels = d3.timeMonths(start_of_year, end_of_year);
    var monthScale = d3.scaleLinear()
      .range([0, calendarHeatmap.settings.width-100])
      .domain([0, month_labels.length]);
	  
    calendarHeatmap.labels.selectAll('.label-month').remove();
    calendarHeatmap.labels.selectAll('.label-month')
      .data(month_labels)
      .enter()
      .append('text')
      .attr('class', function(d) {
			return calendarHeatmap.isCurrentMonth(d, 'month')? 'label label-month currMoment' : 'label label-month';
	  })
      .attr('font-size', function(d) {
        return (calendarHeatmap.isCurrentMonth(d) ? Math.floor(calendarHeatmap.settings.label_padding / 3) + 1: Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {
        return d.toLocaleDateString('en-us', { month: 'short' }) + ',' + moment(calendarHeatmap.selected.date).format('YYYY');
      })
      .attr('x', function(d, i) {
        return (monthScale(i) + (monthScale(i) - monthScale(i - 1)) / 2);
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected_month = moment(d);
        calendarHeatmap.items.selectAll('.item-rect')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return moment(d.date).isSame(selected_month, 'month') ? 1 : 0.1;
          });
		  
		calendarHeatmap.items.selectAll('.text')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return moment(d.date).isSame(selected_month, 'month') ? 1 : 0.1;
          });
		  
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-rect')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
		  
		calendarHeatmap.items.selectAll('.text')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);		  
      })
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Check month data
        var month_data = calendarHeatmap.data.filter(function(e) {
          return moment(d).startOf('month') <= moment(e.date) && moment(e.date) < moment(d).endOf('month');
        });

        // Don't transition if there is no data to show
        if (!month_data.length) { return; }

        // Set selected month to the one clicked on
        calendarHeatmap.selected = { date: d };

        calendarHeatmap.in_transition = true;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeYearOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'month';
        calendarHeatmap.drawChart();
      });

    // Add day labels
  
	  
	  
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', function(d){
		  return (calendarHeatmap.isCurrentMonth(d)) ? 'label label-day currMoment' : 'label label-day';
	  })
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function(d, i) {		
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function(d) {
        return ((calendarHeatmap.isCurrentMonth(d)) ? Math.floor(calendarHeatmap.settings.label_padding / 3) + 1 : Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {
        return moment(d).format('dddd')[0] + moment(d).format('dddd')[1] + moment(d).format('dddd')[2];
      })
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-rect')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
		  
		  calendarHeatmap.items.selectAll('.text')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-rect')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
		  
		  calendarHeatmap.items.selectAll('.text')
			  .transition()
			  .duration(calendarHeatmap.settings.transition_duration)
			  .ease(d3.easeLinear)
			  .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw month overview
   */
  drawMonthOverview: function() {
	  
	calendarHeatmap.items.selectAll('.text').remove();
	// Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define beginning and end of the month
    var start_of_month = moment(calendarHeatmap.selected.date).startOf('month');
    var end_of_month = moment(calendarHeatmap.selected.date).endOf('month');
	
    // Filter data down to the selected month
    var monthDates = calendarHeatmap.data.filter(function(d) {
      return start_of_month <= moment(d.date) && moment(d.date) < end_of_month;
    });
	
	var month_data = calendarHeatmap.mergeMissingDates(start_of_month, end_of_month, monthDates);
	
	
    var max_value = d3.max(month_data, function(d) {
      return d3.max(d.summary, function(d) {
        return d.value;
      });
    });
	

    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(day_labels.map(function(d) {
        return moment(d).weekday();
      }));

    // Define week labels and axis
    var week_labels = [start_of_month.clone()];
    while (start_of_month.week() !== end_of_month.week()) {
      week_labels.push(start_of_month.add(1, 'week').clone());
    }
    var weekScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.width])
      .padding([0.05])
      .domain(week_labels.map(function(weekday) {
        return weekday.week();
      }));

    // Add month data items to the overview
	calendarHeatmap.labels.selectAll('.label-monthDate').remove();
	calendarHeatmap.labels.selectAll('.label-dayDate').remove();
    calendarHeatmap.items.selectAll('.item-block-month').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-month')
      .data(month_data)
      .enter()
      .append('g')
      .attr('class', 'item item-block-month')
      .attr('width', function() {
        return (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function() {
		  // returning 40;
        return (Math.max(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height))-calendarHeatmap.settings.label_padding;
      })
      .attr('transform', function(d) {
        return 'translate(' + (weekScale(moment(d.date).week()))+ ',' + ((dayScale(moment(d.date).weekday()) + dayScale.bandwidth() / 1.75) - 15) + ')';
      })
      .attr('total', function(d) {
        return d.total;
      })
      .attr('date', function(d) {
        return d.date;
      })
      .attr('offset', 0)
	  .attr('lblOffset', 0)
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Don't transition if there is no data to show
        if (d.total === 0) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all month overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      });	  
	  
	  var item_width = (calendarHeatmap.settings.width - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
	  var itemScale = d3.scaleLinear()
		.rangeRound([0, item_width]);
	  
	  // add rectangles 
    item_block.selectAll('.item-block-rect')
      .data(function(d) {
        return d.summary;
      }) 
      .enter()
      .append('rect')
      .attr('class', 'item item-block-rect')
      .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var offset = parseInt(d3.select(this.parentNode).attr('offset'));
        itemScale.domain([0, total]);
        d3.select(this.parentNode).attr('offset', offset + itemScale(d.value));
        return offset;
      })
	  .attr('stroke', function(d) {
        return  d.value > 0 ? "#292929": '#ccc';
      })      
      .attr('width', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));	
        itemScale.domain([0, total]);
        return d.value <=0 ? d3.select(this.parentNode).attr('width') :  Math.max((itemScale(d.value) - calendarHeatmap.settings.item_gutter), 1)
      })    
	  .attr('height', function() {
        return (Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height)) + ( 0.75 * calendarHeatmap.settings.item_gutter);
      })
      .attr('fill', function(d) {
		 var colorRange = [calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum()),calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum())];
         var color = d3.scaleLinear()
          .range( colorRange)
          .domain([-0.15 * max_value, max_value]);
        return   d.value > 0 ? (color(d.value) || '#ff4500') : '#fff'; 
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
		if (calendarHeatmap.in_transition) { return; }	 
		if (d.value <=0 ) { return;}
        // Get date from the parent node
        var date = new Date(d3.select(this.parentNode).attr('date'));
		var objData = d3.select(this.parentNode).datum();
		var parentNode = null;
		if (objData) {
			var newArray = objData.details.filter(function (el){
			  return el.name == d.name; });
			parentNode = newArray[0];
		}		
		
        // Construct tooltip
        var tooltip_html = '';
		
		if (d.type == 3) {		
			 tooltip_html += '<div class="header"><strong>' + (objData.strProjects ? objData.strProjects : d.name) + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			tooltip_html += '<div class="header"><strong>' + (parentNode ? parentNode.strProjects : (objData.strProjects ? objData.strProjects : d.name)) + '</strong></div><br>';
			tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' booked</strong></div>';
			tooltip_html += '<div>on ' + moment(date).format('dddd, MMM Do YYYY') + '</div>';
		}
		
		// Calculate tooltip position
        var x = weekScale(moment(date).week()) + calendarHeatmap.settings.tooltip_padding;
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= 10;
        }
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

       // var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.tooltip_padding;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });	  
	 
	/****************************/
		var mnths = ['21/11'];
		// add text;
	  item_block.selectAll('.text').remove();
	  item_block.selectAll('.text')
      .data(mnths) 
      .enter()
	  .append('text')
	  .attr('class', 'text')		  
	  .text(function(d, i) {
		  var strD = d3.select(this.parentNode).datum().strWeekSummary ? ' ( ' + d3.select(this.parentNode).datum().strWeekSummary + ' )': '';
		return moment(d3.select(this.parentNode).attr('date')).format('DD/MM') 
		 + ' : '  + 		(d3.select(this.parentNode).attr('total') ? (calendarHeatmap.formatTime(d3.select(this.parentNode).attr('total')) + strD   ) : 'No time');
	  }) 
	  .style('fill',function(d,i) {		
		  var color = calendarHeatmap.getTextColor(d3.select(this.parentNode).attr('total'),d3.select(this.parentNode).datum(), '');
		  return   d3.select(this.parentNode).attr('total') > 0 ? color  : '#bfbfbf';
	  })
	  .attr("text-anchor", "left")
	  .attr("opacity", "1")
	  .attr('y', function() {
        return 15;// Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
	  .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var lblOffset = parseInt(d3.select(this.parentNode).attr('lblOffset'));
        itemScale.domain([0, total]);
		d3.select(this.parentNode).attr('lblOffset', lblOffset + itemScale(d.value));
        return lblOffset;
      });
	  
    // Add week labels
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.labels.selectAll('.label-week')
      .data(week_labels)
      .enter()
      .append('text')
      .attr('class', function(d) {
		  return (moment(d).week() ===  calendarHeatmap.currDate.week()) ? 'label label-week currMoment' : 'label label-week';
	  })
      .attr('font-size', function(d) {
		   return ((moment(d).week() ===  calendarHeatmap.currDate.week()) ? Math.floor(calendarHeatmap.settings.label_padding / 3) +1 : Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {	
		var startOfWeek = moment().year(d.year()).week(d.week()).startOf('week').format('DD/MMM');
		var endOfWeek = moment().year(d.year()).week(d.week()).endOf('week').format('DD/MMM');	
        return 'Week ' + d.week() + ' (' +startOfWeek + ' - ' + endOfWeek + ')'  ;
      })
      .attr('x', function(d) {
        return weekScale(d.week());
      })
      .attr('y', (calendarHeatmap.settings.label_padding / 2))
      .on('mouseenter', function(weekday) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).week() === weekday.week()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Check week data
        var week_data = calendarHeatmap.data.filter(function(e) {
          return d.startOf('week') <= moment(e.date) && moment(e.date) < d.endOf('week');
        });

        // Don't transition if there is no data to show
        if (!week_data.length) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected month to the one clicked on
        calendarHeatmap.selected = { date: d };

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'week';
        calendarHeatmap.drawChart();
      });

    // Add day labels
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', function(d) {
		    return (moment(d).day() ===  calendarHeatmap.currDate.day()) ? 'label label-day currMoment' : 'label label-day';
	  })
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function(d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function(d) {
		     return ((moment(d).day() ===  calendarHeatmap.currDate.day()) ?  Math.floor(calendarHeatmap.settings.label_padding / 3) + 1 :  Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {
        return moment(d).format('dddd')[0] +  moment(d).format('dddd')[1] +  moment(d).format('dddd')[2];
      })
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  
   /**
   * Draw month overview version 2
   */
  drawMonthOverview2: function() {
	  
	calendarHeatmap.items.selectAll('.text').remove();
	// Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define beginning and end of the month
    var start_of_month = moment(calendarHeatmap.selected.date).startOf('month');
    var end_of_month = moment(calendarHeatmap.selected.date).endOf('month');
	
    // Filter data down to the selected month
    var monthDates = calendarHeatmap.data.filter(function(d) {
      return start_of_month <= moment(d.date) && moment(d.date) < end_of_month;
    });
	
	var month_data = calendarHeatmap.mergeMissingDates(start_of_month, end_of_month, monthDates);
	
	
    var max_value = d3.max(month_data, function(d) {
      return d3.max(d.summary, function(d) {
        return d.value;
      });
    });
	

    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height - 200])
      .domain(day_labels.map(function(d) {
        return moment(d).weekday();
      }));

    // Define week labels and axis
    var week_labels = [start_of_month.clone()];
    while (start_of_month.week() !== end_of_month.week()) {
      week_labels.push(start_of_month.add(1, 'week').clone());
    }
    var weekScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.width-200])
      .padding([0.05])
      .domain(week_labels.map(function(weekday) {
        return weekday.week();
      }));

    // Add month data items to the overview
	calendarHeatmap.labels.selectAll('.label-monthDate').remove();
	calendarHeatmap.labels.selectAll('.label-dayDate').remove();
    calendarHeatmap.items.selectAll('.item-block-month').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-month')
      .data(month_data)
      .enter()
      .append('g')
      .attr('class', 'item item-block-month')
      .attr('width', function() {
        return ((calendarHeatmap.settings.width-200) - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function() {
		  // returning 40;
        return ((Math.max(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height))-calendarHeatmap.settings.label_padding) ;
      })
      .attr('transform', function(d,i) {
        return 'translate(' + (weekScale(moment(d.date).week()))+ ',' + ((dayScale(moment(d.date).weekday()) + dayScale.bandwidth() / 1.75) - 15) + ')';
      })
      .attr('total', function(d) {
        return d.total;
      })
      .attr('date', function(d) {
        return d.date;
      })
      .attr('offset', 0)
	  .attr('lblOffset', 0)
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Don't transition if there is no data to show
        if (d.total === 0) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all month overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      });	  
	  
	  var item_width = ((calendarHeatmap.settings.width-200)- calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
	  var itemScale = d3.scaleLinear()
		.rangeRound([0, item_width]);
	  
	  // add rectangles 
    item_block.selectAll('.item-block-rect')
      .data(function(d) {
        return d.summary;
      }) 
      .enter()
      .append('rect')
      .attr('class', 'item item-block-rect')
      .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var offset = parseInt(d3.select(this.parentNode).attr('offset'));
        itemScale.domain([0, total]);
        d3.select(this.parentNode).attr('offset', offset + itemScale(d.value));
        return offset;
      })
	  .attr('stroke', function(d) {
        return  d.value > 0 ? "#292929": '#ccc';
      })      
      .attr('width', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));	
        itemScale.domain([0, total]);
        return d.value <=0 ? d3.select(this.parentNode).attr('width') :  Math.max((itemScale(d.value) - calendarHeatmap.settings.item_gutter), 1)
      })    
	  .attr('height', function() {
        return ((Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height)) + ( 0.75 * calendarHeatmap.settings.item_gutter)) + 15;
      })
      .attr('fill', function(d) {
		 var colorRange = [calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum()),calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum())];
         var color = d3.scaleLinear()
          .range( colorRange)
          .domain([-0.15 * max_value, max_value]);
        return   d.value > 0 ? (color(d.value) || '#ff4500') : '#fff'; 
      })
      .style('opacity', 0)
      .on('mouseover', function(d) {
		if (calendarHeatmap.in_transition) { return; }	 
		if (d.value <=0 ) { return;}
        // Get date from the parent node
        var date = new Date(d3.select(this.parentNode).attr('date'));
		var objData = d3.select(this.parentNode).datum();
		var parentNode = null;
		if (objData) {
			var newArray = objData.details.filter(function (el){
			  return el.name == d.name; });
			parentNode = newArray[0];
		}		
		
        // Construct tooltip
        var tooltip_html = '';
		
		if (d.type == 3) {		
			 tooltip_html += '<div class="header"><strong>' + (objData.strProjects ? objData.strProjects : d.name) + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			tooltip_html += '<div class="header"><strong>' + (parentNode ? parentNode.strProjects : (objData.strProjects ? objData.strProjects : d.name)) + '</strong></div><br>';
			tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' booked</strong></div>';
			tooltip_html += '<div>on ' + moment(date).format('dddd, MMM Do YYYY') + '</div>';
		}
		
		// Calculate tooltip position
        var x = weekScale(moment(date).week()) + calendarHeatmap.settings.tooltip_padding;
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= 10;
        }
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

       // var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.tooltip_padding;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });	  
	 
	/****************************/
		var mnths = ['21/11'];
		// add text;
	  item_block.selectAll('.text').remove();
	  item_block.selectAll('.text')
      .data(mnths) 
      .enter()
	  .append('text')
	  .attr('class', 'text')		  
	  .text(function(d, i) {
		  console.log(d3.select(this.parentNode).datum());
		  
		  var strWeek = d3.select(this.parentNode).datum().strWeekSummary;
		  strWeek = strWeek ? (strWeek.length > 13 ?  strWeek.slice(0,13) + '..' : strWeek) : '';
		  var strD = d3.select(this.parentNode).datum().strWeekSummary ? ' ( ' + strWeek + ' )': '';
		return moment(d3.select(this.parentNode).attr('date')).format('DD/MM') 
		 + ' : '  + 		(d3.select(this.parentNode).attr('total') ? (calendarHeatmap.formatTime(d3.select(this.parentNode).attr('total')) + strD   ) : 'No time');
	  }) 
	  .style('fill',function(d,i) {		
		  var color = calendarHeatmap.getTextColor(d3.select(this.parentNode).attr('total'),d3.select(this.parentNode).datum(), '');
		  return   d3.select(this.parentNode).attr('total') > 0 ? color  : '#bfbfbf';
	  })
	  .attr("text-anchor", "left")
	  .attr("opacity", "1")
	  .attr('y', function() {
        return 15;// Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
	  .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var lblOffset = parseInt(d3.select(this.parentNode).attr('lblOffset'));
        itemScale.domain([0, total]);
		d3.select(this.parentNode).attr('lblOffset', lblOffset + itemScale(d.value));
        return lblOffset + 5;
      });
	  
    // Add week labels
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.labels.selectAll('.label-week')
      .data(week_labels)
      .enter()
      .append('text')
      .attr('class', function(d) {
		  return (moment(d).week() ===  calendarHeatmap.currDate.week()) ? 'label label-week currMoment' : 'label label-week';
	  })
      .attr('font-size', function(d) {
		   return ((moment(d).week() ===  calendarHeatmap.currDate.week()) ? Math.floor(calendarHeatmap.settings.label_padding / 3) +1 : Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {	
		var startOfWeek = moment().year(d.year()).week(d.week()).startOf('week').format('DD/MMM');
		var endOfWeek = moment().year(d.year()).week(d.week()).endOf('week').format('DD/MMM');	
        return 'Week ' + d.week() + ' (' +startOfWeek + ' - ' + endOfWeek + ')'  ;
      })
      .attr('x', function(d) {
        return weekScale(d.week());
      })
      .attr('y', (calendarHeatmap.settings.label_padding / 2))
      .on('mouseenter', function(weekday) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).week() === weekday.week()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Check week data
        var week_data = calendarHeatmap.data.filter(function(e) {
          return d.startOf('week') <= moment(e.date) && moment(e.date) < d.endOf('week');
        });

        // Don't transition if there is no data to show
        if (!week_data.length) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected month to the one clicked on
        calendarHeatmap.selected = { date: d };

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all year overview related items and labels
        calendarHeatmap.removeMonthOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'week';
        calendarHeatmap.drawChart();
      });

    // Add day labels
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', function(d) {
		    return (moment(d).day() ===  calendarHeatmap.currDate.day()) ? 'label label-day currMoment' : 'label label-day';
	  })
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function(d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function(d) {
		     return ((moment(d).day() ===  calendarHeatmap.currDate.day()) ?  Math.floor(calendarHeatmap.settings.label_padding / 3) + 1 :  Math.floor(calendarHeatmap.settings.label_padding / 3)) + 'px';
      })
      .text(function(d) {
        return moment(d).format('dddd')[0] +  moment(d).format('dddd')[1] +  moment(d).format('dddd')[2];
      })
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-month')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  
   
  
  /**
   * Draw week overview
   */
  drawWeekOverview: function() {
    // Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Define beginning and end of the week
    var start_of_week = moment(calendarHeatmap.selected.date).startOf('week');
    var end_of_week = moment(calendarHeatmap.selected.date).endOf('week');

    // Filter data down to the selected week
    var weekDates = calendarHeatmap.data.filter(function(d) {
      return start_of_week <= moment(d.date) && moment(d.date) < end_of_week;
    });
   
	
	var week_data = calendarHeatmap.mergeMissingDates(start_of_week, end_of_week, weekDates);
	
	var max_value = d3.max(week_data, function(d) {
      return d3.max(d.summary, function(d) {
        return d.value;
      });
    });

    // Define day labels and axis
    var day_labels = d3.timeDays(moment().startOf('week'), moment().endOf('week'));
    var dayScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height-200])
      .domain(day_labels.map(function(d) {
        return moment(d).weekday();
      }));
	  

    // Define week labels and axis
    var week_labels = [start_of_week];
    var weekScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.width-300])
      .padding([0.05])
      .domain(week_labels.map(function(weekday) {
        return weekday.week();
      }));

    // Add week data items to the overview
	calendarHeatmap.items.selectAll('.text').remove();
	calendarHeatmap.items.selectAll('.label-monthDate').remove();
    calendarHeatmap.items.selectAll('.item-block-week').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block-week')
      .data(week_data)
      .enter()
      .append('g')
      .attr('class', 'item item-block-week')
      .attr('width', function() {
        return ((calendarHeatmap.settings.width-300) - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
      })
      .attr('height', function() {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
      .attr('transform', function(d) {
        return 'translate(' + weekScale(moment(d.date).week()) + ',' + ((dayScale(moment(d.date).weekday()) + dayScale.bandwidth() / 1.75) - 15) + ')';
      })
      .attr('total', function(d) {
        return d.total;
      })
      .attr('date', function(d) {
        return d.date;
      })
      .attr('offset', 0)
	  .attr('lblOffset', 0)
      .on('click', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        // Don't transition if there is no data to show
        if (d.total === 0) { return; }

        calendarHeatmap.in_transition = true;

        // Set selected date to the one clicked on
        calendarHeatmap.selected = d;

        // Hide tooltip
        calendarHeatmap.hideTooltip();

        // Remove all week overview related items and labels
        calendarHeatmap.removeWeekOverview();

        // Redraw the chart
        calendarHeatmap.overview = 'day';
        calendarHeatmap.drawChart();
      });

    var item_width = ((calendarHeatmap.settings.width-300) - calendarHeatmap.settings.label_padding) / week_labels.length - calendarHeatmap.settings.gutter * 5;
    var itemScale = d3.scaleLinear()
      .rangeRound([0, item_width]);

    item_block.selectAll('.item-block-rect')
      .data(function(d) {
        return d.summary;
      })
      .enter()
      .append('rect')
      .attr('class', 'item item-block-rect')
      .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var offset = parseInt(d3.select(this.parentNode).attr('offset'));
        itemScale.domain([0, total]);
        d3.select(this.parentNode).attr('offset', offset + itemScale(d.value));
        return offset;
      })
      .attr('width', function(d) {
		 var total = parseInt(d3.select(this.parentNode).attr('total'));	
        itemScale.domain([0, total]);
        return d.value <=0 ? d3.select(this.parentNode).attr('width') :  Math.max((itemScale(d.value) - calendarHeatmap.settings.item_gutter), 1)
      })
	  .attr('stroke', function(d) {
        return  d3.select(this.parentNode).attr('total') > 0 ? "#292929": '#ccc';
      })    
      .attr('height', function() {
        return Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height)+ 15;
      })	  
	  .attr('fill', function(d) {
		 var colorRange = [calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum()),calendarHeatmap.getColor(d.value,d3.select(this.parentNode).datum())];
         var color = d3.scaleLinear()
          .range( colorRange)
          .domain([-0.15 * max_value, max_value]);
        return   d.value > 0 ? (color(d.value) || '#ff4500') : '#fff'; 
      })     
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.value <=0) { return; }
        // Get date from the parent node
        var date = new Date(d3.select(this.parentNode).attr('date'));

        // Construct tooltip
        var tooltip_html = '';
		console.log(d3.select(this.parentNode).datum());
		console.log(d);
		if (d.type == 3) {
			 tooltip_html += '<div class="header"><strong>' + d3.select(this.parentNode).datum().strProjects + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			tooltip_html += '<div class="header"><strong>' + d.name + '</strong></div><br>';
			tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' booked</strong></div>';
			tooltip_html += '<div>on ' + moment(date).format('dddd, MMM Do YYYY') + '</div>';
		}
		
        // Calculate tooltip position
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        itemScale.domain([0, total]);
        var x = parseInt(d3.select(this).attr('x')) + itemScale(d.value) / 4 + calendarHeatmap.settings.tooltip_width / 4;
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= 10;
        }
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

       // var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.tooltip_padding;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }
        calendarHeatmap.hideTooltip();
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });

/****************************/
		var mnths = ['21/11'];
		// add text;
	  item_block.selectAll('.text').remove();
	  item_block.selectAll('.text')
      .data(mnths) 
      .enter()
	  .append('text')
	  .attr('class', 'text')	  
	  .text(function(d, i) {
		var strDetails = d3.select(this.parentNode).attr('total') && d3.select(this.parentNode).attr('total') > 0 
						 ? (calendarHeatmap.formatTime(d3.select(this.parentNode).attr('total'))  
          + '    ;  ( ' + 	d3.select(this.parentNode).datum().strProjects	+ ' )' ) : null;
		return moment(d3.select(this.parentNode).attr('date')).format('DD/MMM')  + ' : ' 
		 + (strDetails ? strDetails : ' : - - ');
	  }) 
	  .style('fill',function(d,i) {		  
		  var color = calendarHeatmap.getTextColor(d3.select(this.parentNode).attr('total'),d3.select(this.parentNode).datum(), '');
		  return   d3.select(this.parentNode).attr('total') > 0 ? color  : '#bfbfbf';	 
	  })
	  .attr("text-anchor", "left")
	  .attr("opacity", "1")
	  .attr('y', function() {
        return 15;// Math.min(dayScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
	  .attr('x', function(d) {
        var total = parseInt(d3.select(this.parentNode).attr('total'));
        var lblOffset = parseInt(d3.select(this.parentNode).attr('lblOffset'));
        itemScale.domain([0, total]);
		d3.select(this.parentNode).attr('lblOffset', lblOffset + itemScale(d.value));
        return lblOffset + 30;
      });
	  
      
	  /****************************/
	  
    // Add week labels
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.labels.selectAll('.label-week')
      .data(week_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-week')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d) {
		var startOfWeek = moment().year(d.year()).week(d.week()).startOf('week').format('DD/MMM');
		var endOfWeek = moment().year(d.year()).week(d.week()).endOf('week').format('DD/MMM');	
		return 'Week ' + d.week() + ' (' +startOfWeek + ' - ' + endOfWeek + ')'  ;		
      })
      .attr('x', function(d) {
        return weekScale(d.week()) + 100;
      })
      .attr('y', calendarHeatmap.settings.label_padding / 2)
      .on('mouseenter', function(weekday) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).week() === weekday.week()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add day labels
	calendarHeatmap.labels.selectAll('.label-monthDate').remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-day')
      .data(day_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-day')
      .attr('x', calendarHeatmap.settings.label_padding / 3)
      .attr('y', function(d, i) {
        return dayScale(i) + dayScale.bandwidth() / 1.75;
      })
      .style('text-anchor', 'left')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d) {
        return moment(d).format('dddd')[0] +  moment(d).format('dddd')[1] +  moment(d).format('dddd')[2];
      })
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected_day = moment(d);
        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (moment(d.date).day() === selected_day.day()) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block-week')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw day overview
   */
  drawDayOverview: function() {
	  	  var lastX =0, lastY= 0;
    // Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Initialize selected date to today if it was not set
    if (!Object.keys(calendarHeatmap.selected).length) {
      calendarHeatmap.selected = calendarHeatmap.data[calendarHeatmap.data.length - 1];
    }
	
	
	var summary =  calendarHeatmap.selected.summary.sort(function(a, b) {
          return b.type < a.type;
        });
		
    var project_labels = summary.map(function(project) {
      return project.name;
    });	
    var projectScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height-200])
      .domain(project_labels);

    var itemScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding * 2, calendarHeatmap.settings.width])
      .domain([moment(calendarHeatmap.selected.date).startOf('day'), moment(calendarHeatmap.selected.date).endOf('day')]);
   
   var pLen = project_labels.length;
      // Add week data items to the overview
	calendarHeatmap.items.selectAll('.text').remove();
	calendarHeatmap.items.selectAll('.label-monthDate').remove();
    calendarHeatmap.items.selectAll('.item-block-day').remove();
    calendarHeatmap.items.selectAll('.item-block').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block')
      .data(calendarHeatmap.selected.details)
      .enter()
      .append('g')
      .attr('class', 'item item-block')
      .attr('width', function(d) {
          var end = itemScale(d3.timeSecond.offset(moment(d.date), d.value));
        return Math.max((end - itemScale(moment(d.date))), 1);
      })
      .attr('height', function() {
         return Math.max(projectScale.bandwidth(), calendarHeatmap.settings.max_block_height) + 20;
      })    
      .attr('total', function(d) {
        return d.total;
      })
      .attr('date', function(d) {
        return d.date;
      })
      .attr('offset', 0)
	  .attr('lblOffset', 0);
      
   
	calendarHeatmap.items.selectAll('.text').remove();
	calendarHeatmap.items.selectAll('.item-block-day').remove();
    item_block.selectAll('.item-block')
      .data(calendarHeatmap.selected.details)
      .enter()
      .append('rect')
      .attr('class', 'item item-block-day')
      .attr('x', function(d) {
        return itemScale(moment(d.date));
      })
      .attr('y', function(d) {
        return (projectScale(d.name) + projectScale.bandwidth() /4) ;
      })
      .attr('width', function(d) {
        var end = itemScale(d3.timeSecond.offset(moment(d.date), d.value));
        return Math.max((end - itemScale(moment(d.date))), 1);
      })
      .attr('height', function() {
		  return Math.min(projectScale.bandwidth(), calendarHeatmap.settings.max_block_height) + 30;
      })
	  .attr('stroke', function(d) {
        return  d.value > 0 ? "#292929": '#ccc';
      }) 
      .attr('fill', function(d) {		
		return  calendarHeatmap.getColor(d.value,d);
      })	  
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.value <= 0) { return; }
		
        // Construct tooltip
        var tooltip_html = '';
		if (d.type == 3) {
			 tooltip_html += '<div class="header"><strong>' + d.strProjects + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			 tooltip_html += '<div class="header"><strong>' + d.strProjects + '</strong><div><br>';
			 tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' booked</strong></div>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		}
		
        // Calculate tooltip position
        var x = d.value * 100 / (60 * 60 * 24) + itemScale(moment(d.date));
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= 10;
        }
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

        //var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.tooltip_padding;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.value <= 0) { return; }
        calendarHeatmap.hideTooltip();
      })
      .on('click', function(d) {
        if (!!calendarHeatmap.handler && typeof calendarHeatmap.handler == 'function') {
          calendarHeatmap.handler(d);
        }
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });
	  
	  
	  /****************************/
		// add text;
	  calendarHeatmap.items.selectAll('.text').remove();
	  calendarHeatmap.items.selectAll('.text')
      .data(calendarHeatmap.selected.details) 
      .enter()
	  .append('text')
	  .attr('class', 'text')	  
	  .text(function(d, i) {
		  
		var strText = (d.strProjects).replaceAll(d.name, '');
		strText = strText.replaceAll('|', '');
		return (d.value ? 
		 calendarHeatmap.formatTime(d.value) : 'No time');
		
	  }) 
	  .style('fill',function(d,i) {
		  return calendarHeatmap.getTotalHours(d.value) > 8 ? '#fff' : 'inherit';
	  })
	  .attr("text-anchor", "left")
	  .attr("opacity", "1")
	      .attr('x', function(d) {
        return itemScale(moment(d.date)) + 5;
      })
      .attr('y', function(d) {
        return (projectScale(d.name) + projectScale.bandwidth() /4) + 15;
      });
	  
      
	  /****************************/
	  
    // Add time labels
    var timeLabels = d3.timeHours(
      moment(calendarHeatmap.selected.date).startOf('day'),
      moment(calendarHeatmap.selected.date).endOf('day')
    );
    var timeScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding * 2, calendarHeatmap.settings.width + 20])
      .domain([0, timeLabels.length]);
    calendarHeatmap.labels.selectAll('.label-time').remove();
    calendarHeatmap.labels.selectAll('.label-time')
      .data(timeLabels)
      .enter()
      .append('text')
      .attr('class', 'label label-time')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d,i) {		
        return i==0 ? moment(d).format('DD/MMM') : moment(d).format('HH:mm');
      })
      .attr('x', function(d, i) {
        return timeScale(i) - 7;
      })
      .attr('y',(calendarHeatmap.settings.label_padding / 2))
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected = itemScale(moment(d));
        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            var start = itemScale(moment(d.date));
            var end = itemScale(moment(d.date).add(d.value, 'seconds'));
            return (selected >= start && selected <= end) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity',1);
      });
	

    // Add project labels
    calendarHeatmap.labels.selectAll('.label-project').remove();
    calendarHeatmap.labels.selectAll('.label-project')
      .data(project_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-project')
      .attr('x', calendarHeatmap.settings.gutter)
      .attr('y', function(d) {
        return (projectScale(d) + projectScale.bandwidth() /4) + 5;//projectScale(d) + projectScale.bandwidth() / 2;
      })
      .attr('min-height', function() {
        return projectScale.bandwidth();
      })
      .style('text-anchor', 'left')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d) {
        return d;
      })
      .each(function() {
        var obj = d3.select(this),
          text_length = obj.node().getComputedTextLength(),
          text = obj.text();
       /* while (text_length > (calendarHeatmap.settings.label_padding * 1.5) && text.length > 0) {
          text = text.slice(0, -1);
          obj.text(text);
          text_length = obj.node().getComputedTextLength();
        }*/
      })
      .on('mouseenter', function(project) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (d.name === project) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  },


  /**
   * Draw the button for navigation purposes
   */
  drawButton: function() {
    calendarHeatmap.buttons.selectAll('.button').remove();
    var button = calendarHeatmap.buttons.append('g')
      .attr('class', 'button button-back')
      .style('opacity', 0)
      .on('click', function() {
        if (calendarHeatmap.in_transition) { return; }

        // Set transition boolean
        calendarHeatmap.in_transition = true;

        // Clean the canvas from whichever overview type was on
        if (calendarHeatmap.overview === 'year') {
          calendarHeatmap.removeYearOverview();
        } else if (calendarHeatmap.overview === 'month') {
          calendarHeatmap.removeMonthOverview();
        } else if (calendarHeatmap.overview === 'week') {
          calendarHeatmap.removeWeekOverview();
        } else if (calendarHeatmap.overview === 'day') {
          calendarHeatmap.removeDayOverview();
        }

        // Redraw the chart
        calendarHeatmap.history.pop();
        calendarHeatmap.overview = calendarHeatmap.history.pop();
        calendarHeatmap.drawChart();
      });
    button.append('circle')
      .attr('cx', calendarHeatmap.settings.label_padding / 2.25)
      .attr('cy', calendarHeatmap.settings.label_padding / 2.5)
      .attr('r', calendarHeatmap.settings.item_size / 2);
    button.append('text')
      .attr('x', calendarHeatmap.settings.label_padding / 2.25)
      .attr('y', calendarHeatmap.settings.label_padding / 2.5)
      .attr('dy', function() {
        return Math.floor(calendarHeatmap.settings.width / 100) / 3;
      })
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .html('&#x2190;');
    button.transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 1);
  },


  /**
   * Transition and remove items and labels related to global overview
   */
  removeGlobalOverview: function() {
    calendarHeatmap.items.selectAll('.item-block-year')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
    calendarHeatmap.labels.selectAll('.label-year').remove();
  },


  /**
   * Transition and remove items and labels related to year overview
   */
  removeYearOverview: function() {
    calendarHeatmap.items.selectAll('.item-rect')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-month').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to month overview
   */
  removeMonthOverview: function() {
    calendarHeatmap.items.selectAll('.item-block-month').selectAll('.item-block-rect')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function(d, i) {
        return (i % 2 === 0) ? -calendarHeatmap.settings.width / 3 : calendarHeatmap.settings.width / 3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to week overview
   */
  removeWeekOverview: function() {
    calendarHeatmap.items.selectAll('.item-block-week').selectAll('.item-block-rect')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function(d, i) {
        return (i % 2 === 0) ? -calendarHeatmap.settings.width / 3 : calendarHeatmap.settings.width / 3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-day').remove();
    calendarHeatmap.labels.selectAll('.label-week').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Transition and remove items and labels related to daily overview
   */
  removeDayOverview: function() {
    calendarHeatmap.items.selectAll('.item-block')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .attr('x', function(d, i) {
        return (i % 2 === 0) ? -calendarHeatmap.settings.width / 3 : calendarHeatmap.settings.width / 3;
      })
      .remove();
    calendarHeatmap.labels.selectAll('.label-time').remove();
    calendarHeatmap.labels.selectAll('.label-project').remove();
    calendarHeatmap.hideBackButton();
  },


  /**
   * Helper function to hide the tooltip
   */
  hideTooltip: function() {
    calendarHeatmap.tooltip.transition()
      .duration(calendarHeatmap.settings.transition_duration / 2)
      .ease(d3.easeLinear)
      .style('opacity', 0);
  },


  /**
   * Helper function to hide the back button
   */
  hideBackButton: function() {
    calendarHeatmap.buttons.selectAll('.button')
      .transition()
      .duration(calendarHeatmap.settings.transition_duration)
      .ease(d3.easeLinear)
      .style('opacity', 0)
      .remove();
  },


  /**
   * Helper function to convert seconds to a human readable format
   * @param seconds Integer
   */
  formatTime: function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var time = '';
    if (hours > 0) {
      time += hours === 1 ? '1 hr ' : hours + ' hrs ';
    }
    if (minutes > 0) {
      time += minutes === 1 ? '1 min' : minutes + ' mins';
    }
    if (hours === 0 && minutes === 0) {
      time = ' - - ';//Math.round(seconds) + ' hrs';
    }
    return time;
  },
  
    /**
   * Helper function to get color shades as per the value
   * @param totalTime Integer
   */
  getColor: function(seconds, objDate, typeName) {	
	if (objDate) {
		seconds = objDate.total ? objDate.total  : objDate.value;
	}
	
	var hours = Math.floor(seconds / 3600);
	var minutes = Math.floor((seconds - (hours * 3600)) / 60);
	var color =  '#faf8f2';
	if (typeName) {
		color = typeName.match(/Sick/) ? calendarHeatmap.objColorConfig.sick : color;
		color = typeName.match(/Annual/) ? calendarHeatmap.objColorConfig.annual : color;
		color = typeName.match(/Public/) ? calendarHeatmap.objColorConfig.pbh : color;
	} else {
		if (hours < 8 ) {
			color = calendarHeatmap.objColorConfig.lesshrs;
		} else  if (hours == 8 ) {
			color = calendarHeatmap.objColorConfig.equalhrs;
		} else  if (hours > 8 ) {
			color = calendarHeatmap.objColorConfig.overhrs;
		}
	}
	
	if (objDate) {
		if (objDate.strToolTip || objDate.strProjects ) {
			var strType = objDate.strProjects ? objDate.strProjects : objDate.strToolTip;
			color = strType.match(/Sick/) ? calendarHeatmap.objColorConfig.sick : color;
			color = strType.match(/Annual/) ? calendarHeatmap.objColorConfig.annual : color;
			color = strType.match(/Public/) ? calendarHeatmap.objColorConfig.pbh : color;
		}
	}    

    return color;
  },
  
  
  getTextColor(seconds, objDate, typeName) {
		  if (objDate) {
			seconds = objDate.total ? objDate.total  : objDate.value;
		}
		
		
		var hours = Math.floor(seconds / 3600);
		var minutes = Math.floor((seconds - (hours * 3600)) / 60);
		var stColor = '#fff';	
		if (typeName) {			
			stColor = typeName && typeName.match(/Sick/) ? 'inherit' : stColor;
			stColor = typeName &&  typeName.match(/Annual/) ?  'inherit'  : stColor;
			stColor = typeName &&  typeName.match(/Public/) ?  'inherit'  : stColor;
		} else {		
			stColor = Math.floor(seconds / 3600) > 8 ? '#fff' :'inherit';			
		}
		
		if (objDate) {
			if (objDate.type) {
				stColor = [1,2,3].includes(objDate.type) ? 'inherit' : stColor;				
			}
		}   
		  
		return stColor;
  },
  getTotalHours(seconds) {
    return Math.floor(seconds / 3600);
  },
  
  isCurrentMonth: function(objDate, strType) {
	  var isTrue = false;
	  isTrue = moment(objDate).date() == calendarHeatmap.currDate.date() 
	  &&  moment(objDate).month() == calendarHeatmap.currDate.month() 
	  &&  moment(objDate).year() == calendarHeatmap.currDate.year();	
	
	  if (strType && strType == 'month') {
		  isTrue = moment(objDate).month() == calendarHeatmap.currDate.month() 
	  &&  moment(objDate).year() == calendarHeatmap.currDate.year();	
	  }
	  return isTrue;
  },
  
  mergeMissingDates: function(startDate, endDate, dataArray) {
	 var mergedData = [];	
	// whole range .
	var dateRange = d3.timeDays(startDate, endDate);
	const format = d3.timeFormat("%Y-%m-%dT00:00:00")

	// merge here 
	dateRange.forEach(function (item, index) {	 
	  var selDate= dataArray.filter(function(el) {return el.date == format(item)});
	  if (selDate && selDate.length) {
		
		  mergedData.push(selDate[0]);
	  } else {
		  mergedData.push({
			'date':   format(item),
			'details': [],
			'total': 0	,
			'strProjects':'',
		    'strToolTip' : '',
			'type': 4,
			'summary':[{
				'name': 'No booking',
				'type' : 4,
				'value' : 0
			}]
		});
	  }
	});
	mergedData.sort(function (a, b) {
	  return moment(a.date) - moment(b.date) ;
	});		  	
	
	return mergedData;		
  },
  
   /**
   * Draw day overview
   */
  drawCompactDayOverview: function() {
	  var lastX =0, lastY= 0;
    // Add current overview to the history
    if (calendarHeatmap.history[calendarHeatmap.history.length - 1] !== calendarHeatmap.overview) {
      calendarHeatmap.history.push(calendarHeatmap.overview);
    }

    // Initialize selected date to today if it was not set
    if (!Object.keys(calendarHeatmap.selected).length) {
      calendarHeatmap.selected = calendarHeatmap.data[calendarHeatmap.data.length - 1];
    }	
	
	var summary =  calendarHeatmap.selected.summary.sort(function(a, b) {
          return a.type - b.type || a.value - b.value;
        });
		
    var project_labels = summary.map(function(project) {
      return project.name;
    });	
	
    var projectScale = d3.scaleBand()
      .rangeRound([calendarHeatmap.settings.label_padding, calendarHeatmap.settings.height])
      .domain(project_labels);

	var startHour = moment(calendarHeatmap.selected.date).startOf('day');

    var itemScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding * 2, calendarHeatmap.settings.width])
      .domain([moment(startHour).add(5, "hours"), moment(calendarHeatmap.selected.date).endOf('day')]);
   
   
      // Add week data items to the overview
	calendarHeatmap.items.selectAll('.text').remove();
	calendarHeatmap.items.selectAll('.label-monthDate').remove();
    calendarHeatmap.items.selectAll('.item-block-day').remove();
    calendarHeatmap.items.selectAll('.item-block').remove();
    var item_block = calendarHeatmap.items.selectAll('.item-block')
      .data(calendarHeatmap.selected.details)
      .enter()
      .append('g')
      .attr('class', 'item item-block')
      .attr('width', function(d) {
          var end = itemScale(d3.timeSecond.offset(moment(d.date), d.value));
        return Math.max((end - itemScale(moment(d.date))), 1);
      })
      .attr('height', function() {
         return Math.min(projectScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })    
      .attr('total', function(d) {
        return d.total;
      })
      .attr('date', function(d) {
        return d.date;
      })
      .attr('offset', 0)
	  .attr('lblOffset', 0);
      
   
	calendarHeatmap.items.selectAll('.text').remove();
	calendarHeatmap.items.selectAll('.item-block-day').remove();
    item_block.selectAll('.item-block')
      .data(calendarHeatmap.selected.details)
      .enter()
      .append('rect')
      .attr('class', 'item item-block-day')
      .attr('x', function(d) {
        return itemScale(moment(d.date));
      })
      .attr('y', function(d, i) {
		  var h1 = ( projectScale.bandwidth() * (i+1))/2 + calendarHeatmap.settings.max_block_height;		
        return h1- (i*10);
      })
      .attr('width', function(d) {
        var end = itemScale(d3.timeSecond.offset(moment(d.date), d.value));
        return Math.max((end - itemScale(moment(d.date))), 1);
      })
      .attr('height', function() {
		  return Math.min(projectScale.bandwidth(), calendarHeatmap.settings.max_block_height);
      })
	  .attr('stroke', function(d) {
        return  d.value > 0 ? "#292929": '#ccc';
      }) 
      .attr('fill', function(d) {		
		return  calendarHeatmap.getColor(d.value,d);
      })	  
      .style('opacity', 0)
      .on('mouseover', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.value <= 0) { return; }
		
        // Construct tooltip
        var tooltip_html = '';
		if (d.type == 3) {
			 tooltip_html += '<div class="header"><strong>' + d.strProjects + '</strong><div><br>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		} else {
			 tooltip_html += '<div class="header"><strong>' + d.strProjects + '</strong><div><br>';
			 tooltip_html += '<div><strong>' + (d.value ? calendarHeatmap.formatTime(d.value) : 'No time') + ' booked</strong></div>';
			 tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div>';
		}
		
        // Calculate tooltip position
        var x = d.value * 100 / (60 * 60 * 24) + itemScale(moment(d.date));
        while (calendarHeatmap.settings.width - x < (calendarHeatmap.settings.tooltip_width + calendarHeatmap.settings.tooltip_padding * 3)) {
          x -= 10;
        }
		var topY = document.getElementById(calendarHeatmap.container).getBoundingClientRect().top > 500 ? 400 : document.getElementById(calendarHeatmap.container).getBoundingClientRect().top;
        var y = Math.abs((topY - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height/4)) + calendarHeatmap.settings.tooltip_padding;

      //  var y = Math.abs((document.getElementById(calendarHeatmap.container).getBoundingClientRect().top - document.getElementById(calendarHeatmap.container).getBoundingClientRect().height)) + calendarHeatmap.settings.tooltip_padding;

        // Show tooltip
        calendarHeatmap.tooltip.html(tooltip_html)
          .style('left', x + 'px')
          .style('top', y + 'px')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration / 2)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      })
      .on('mouseout', function(d) {
        if (calendarHeatmap.in_transition) { return; }
		if (d.value <= 0) { return; }
        calendarHeatmap.hideTooltip();
      })
      .on('click', function(d) {
        if (!!calendarHeatmap.handler && typeof calendarHeatmap.handler == 'function') {
          calendarHeatmap.handler(d);
        }
      })
      .transition()
      .delay(function() {
        return (Math.cos(Math.PI * Math.random()) + 1) * calendarHeatmap.settings.transition_duration;
      })
      .duration(function() {
        return calendarHeatmap.settings.transition_duration;
      })
      .ease(d3.easeLinear)
      .style('opacity', 1)
      .call(function(transition, callback) {
        if (transition.empty()) {
          callback();
        }
        var n = 0;
        transition
          .each(function() {++n; })
          .on('end', function() {
            if (!--n) {
              callback.apply(this, arguments);
            }
          });
      }, function() {
        calendarHeatmap.in_transition = false;
      });
	  
	  
	  /****************************/
		// add text;
	  calendarHeatmap.items.selectAll('.text').remove();
	  calendarHeatmap.items.selectAll('.text')
      .data(calendarHeatmap.selected.details) 
      .enter()
	  .append('text')
	  .attr('class', 'text')	  
	  .text(function(d, i) {
		  
		var strText = (d.strProjects).replaceAll(d.name, '');
		strText = strText.replaceAll('|', '');
		return (d.value ? 
		 calendarHeatmap.formatTime(d.value) : 'No time');
		
	  }) 
	  .style('fill',function(d,i) {
		  return calendarHeatmap.getTotalHours(d.value) > 8 ? '#fff' : 'inherit';
	  })
	  .attr("text-anchor", "left")
	  .attr("opacity", "1")
	      .attr('x', function(d) {
        return itemScale(moment(d.date) + 5) + 5;
      })
      .attr('y', function(d, i) {
		 var h1 = ( projectScale.bandwidth() * (i+1))/2 + calendarHeatmap.settings.max_block_height;		
        return (h1 - (i*10)) + 12; //(projectScale(d.name) + projectScale.bandwidth() / 2) - 5;
      });
	  
      
	  /****************************/
	  
    // Add time labels
    var timeLabels = d3.timeHours(
      moment(calendarHeatmap.selected.date).startOf('day'),
      moment(calendarHeatmap.selected.date).endOf('day')
    );
	
	timeLabels.splice(0, 5);
    var timeScale = d3.scaleTime()
      .range([calendarHeatmap.settings.label_padding * 2, calendarHeatmap.settings.width + 20])
      .domain([0, timeLabels.length]);
    calendarHeatmap.labels.selectAll('.label-time').remove();
    calendarHeatmap.labels.selectAll('.label-time')
      .data(timeLabels)
      .enter()
      .append('text')
      .attr('class', 'label label-time')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d,i) {		
        return i==0 ? moment(d).format('DD/MMM') : moment(d).format('HH:mm');
      })
      .attr('x', function(d, i) {
        return timeScale(i) - 7;
      })
      .attr('y',(calendarHeatmap.settings.label_padding / 2))
      .on('mouseenter', function(d) {
        if (calendarHeatmap.in_transition) { return; }

        var selected = itemScale(moment(d));
        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            var start = itemScale(moment(d.date));
            var end = itemScale(moment(d.date).add(d.value, 'seconds'));
            return (selected >= start && selected <= end) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity',1);
      });

    // Add project labels
    calendarHeatmap.labels.selectAll('.label-project').remove();
    calendarHeatmap.labels.selectAll('.label-project')
      .data(project_labels)
      .enter()
      .append('text')
      .attr('class', 'label label-project')
      .attr('x', calendarHeatmap.settings.gutter)
      .attr('y', function(d, i) {
		  var  h1 = ( projectScale.bandwidth() * (i+1))/2 + calendarHeatmap.settings.max_block_height;
        return h1 - (i*10);		//projectScale(d) + projectScale.bandwidth() / 2;
      })
      .attr('min-height', function() {
        return projectScale.bandwidth();
      })
      .style('text-anchor', 'left')
      .attr('font-size', function() {
        return Math.floor(calendarHeatmap.settings.label_padding / 3) + 'px';
      })
      .text(function(d) {
        return d;
      })
      .each(function() {
        var obj = d3.select(this),
          text_length = obj.node().getComputedTextLength(),
          text = obj.text();
       /* while (text_length > (calendarHeatmap.settings.label_padding * 1.5) && text.length > 0) {
          text = text.slice(0, -1);
          obj.text(text);
          text_length = obj.node().getComputedTextLength();
        }*/
      })
      .on('mouseenter', function(project) {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', function(d) {
            return (d.name === project) ? 1 : 0.1;
          });
      })
      .on('mouseout', function() {
        if (calendarHeatmap.in_transition) { return; }

        calendarHeatmap.items.selectAll('.item-block')
          .transition()
          .duration(calendarHeatmap.settings.transition_duration)
          .ease(d3.easeLinear)
          .style('opacity', 1);
      });

    // Add button to switch back to previous overview
    calendarHeatmap.drawButton();
  } ,
  
  drawNewDayOverview: function() {
	 
  }
}
  
