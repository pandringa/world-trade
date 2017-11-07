Array.prototype.max = function() {
  var max = -999999999999999999;
  for(var i of this)
    if(i > max) max = i;
  return max;
}

// Set up Interactive
function Interactive(){
  var self = this;

  this.country_index = {};
  this.country = null;
  this.country_data = null;
  this.start_year = 1962.0;
  this.end_year = 2016.0;
  this.year = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
  this.flow = 'm';
  this.limit = 1;
  this.table_row_count = 10;
  this.timeline_interval = $(window).width() > 768 ? 5 : 10;
  this.timeline_offset = 5;
  this.timeline_width = $('#timeline').width();
  this.play_timer = false;

  // Helper methods
  function calcWidth(amount){
    return Math.floor(5 * amount / 90000000)+1;
  }
  function calcColor(amount, flow){
    var a = amount / 200000000 + 0.4;
    return flow == 'x' ? 'rgba(43,102,144,'+a+')' : 'rgba(43,102,144,'+a+')';
  }
  function getX(year) {
    return (year-self.start_year) / (self.end_year-self.start_year) * (self.timeline_width-self.timeline_offset) + self.timeline_offset;
  }
  function getClosestYear(x){
    var guess = Math.round((x-self.timeline_offset) /  (self.timeline_width-self.timeline_offset) * (self.end_year - self.start_year) + self.start_year);
    if(!self.country_data || self.country_data[guess]) return guess;
    var up = guess, down = guess;
    while(up <= self.end_year && self.country_data[up] == undefined) up++;
    while(down >= self.start_year && self.country_data[down] == undefined) down--;
    return (up - guess) < (down - guess) ? up : down;
  }

  // Render Methods
  function renderYears(start, end){
    self.timeline_width = $('#timeline').width()
    var years = [...Array(end-start).keys()].map(n => n + start).filter(n => n % self.timeline_interval == 0);

    var labels = d3.select('.timeline-years')
      .selectAll('span.year')
      .data(years, d => d+self.country);

    labels.style('left', year => {
          return getX(year);
        })

    labels.exit().remove();

    labels.enter()
        .append('span')
        .attr('class', 'year')
        .style('left', year => {
          return getX(year);
        })
        .text(year => year);
  }
  function renderTable(){
    var rows = Object.keys(self.country_data[self.year]).map(code => {
      return {
        name: self.country_index[code],
        imports: self.country_data[self.year][code].m || 0,
        exports: self.country_data[self.year][code].x || 0
      }
    }).sort((a,b) => {
      return (b.exports+b.imports) - (a.exports+a.imports)
    })

    if(self.table_row_count != 'all' && parseInt(self.table_row_count) > 0 && parseInt(self.table_row_count) <= rows.length){
      rows = rows.slice(0, parseInt(self.table_row_count))
    }

    var table = d3.select('#country-table tbody')
      .selectAll('tr')
      .data(rows, d => self.country+d.name+d.imports+d.exports)

    table.exit().remove()

    var row = table.enter().append('tr')
    row.append('td').text(d => d.name)
    row.append('td').text(d => Math.round(d.imports / 1000))
      .attr('data-sort-value', d => d.imports)
    row.append('td').text(d => Math.round(d.exports / 1000))
      .attr('data-sort-value', d => d.exports)

    $('#country-name').text(self.country_index[self.country]);
    $('#data-year').text(self.year);
  }
  function renderMap(){
    $('#timeline .bar').css('padding-left', getX(self.year));
    if(self.country_data[self.year]){
      var arcs = Object.keys(self.country_data[self.year]).map(partner => {
          var amount = self.country_data[self.year][partner][self.flow]
          if(amount == undefined) return false;
          return {
            origin: self.flow == 'x' ? self.country : partner, 
            destination: self.flow == 'x' ? partner : self.country,
            strokeWidth: calcWidth(amount),
            strokeColor: calcColor(amount, self.flow),
            amount: amount,
          }
        })
        .filter(d => d)
        .sort((t1, t2) => t2.amount - t1.amount)
      if(self.limit){
        var lim = self.limit <= 1 ? self.limit * arcs.length : self.limit;
        arcs = arcs.slice(0, lim)
      }
      var options = { 
        idFunction: a => a.origin + a.destination
      };
      $('#current-year').text(self.year);
      self.map.arc(arcs, options);
    }else{
      console.log("No data for year", self.year)
    }
  }

  // Public Methods
  this.incrementYear = function incrementYear(options){
    if(self.year == self.end_year) return;
    self.year++;
    while(self.country_data && self.year <= self.end_year && self.country_data[self.year] == undefined) self.year++;
    renderMap();
    if(options == undefined || !options.noTable) renderTable();
  }
  this.decrementYear = function decrementYear(options){
    if(self.year == self.start_year) return;
    self.year--;
    while(self.country_data && self.year >= self.start_year && self.country_data[self.year] == undefined) self.year--;
    renderMap();
    renderTable();
  }
  this.setYear = function setYear(year){
    self.year = year || self.year;
    renderMap();
    renderTable();
  }
  this.resetYear = function resetYear(){
    self.setYear(self.start_year);
  }

  this.updateCountry = function updateCountry(map, country){
    while($('.datamaps-subunit.selected')[0]) $('.datamaps-subunit.selected').removeClass('selected');
    $('.datamaps-subunit.'+country).addClass('selected');
    $.ajax({
      url: 'data/countries/'+country+'.json'
    }).fail(err => {
      console.log("no results");
    }).done(data => {
      if(data == undefined || data == null) return;
      self.country_data = data;
      self.country = country;
      self.end_year = 0;
      self.start_year = 3000;
      for(var year of Object.keys(data)){
        year = parseInt(year)
        if(year > self.end_year) self.end_year = year;
        if(year < self.start_year) self.start_year = year;
      }
      renderYears(self.start_year, self.end_year)
      self.year = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
      renderMap();
      renderTable()
      $('#country-search').dropdown("set selected", country);
      $('#row-count').dropdown("set selected", self.table_row_count);
    });
  }

  // Initialization code
  // Create Map
  this.map = new Datamap({
    element: document.getElementById('datamap'),
    responsive: true,
    projection: 'mercator',
    fills: {
        defaultFill: 'rgba(212,223,239,1)',
    },
    geographyConfig: {
      highlightFillColor: '#C0C1C2',
      highlightBorderColor: '#C0C1C2',
    },
    done: datamap => {
      datamap.svg.selectAll('.datamaps-subunit').on('click', geo => self.updateCountry(datamap, geo.id))
    }
  });

  // Create Dropdown
  $.ajax({
    url: 'data/countries/index.json'
  }).done(countries => {
    self.country_index = countries;
    $dropdown = $('#country-search .menu');
    for(var code of Object.keys(countries).sort()){
      $dropdown.append("<div class='item' data-value='"+code+"'>"+countries[code]+"</div>");
    }
    $('#country-search')
    .dropdown({
      action: 'activate',
      onChange: code => self.updateCountry(self.map, code)
    });
    $('#country-search').removeClass('loading');
  });

  self.updateCountry(self.map, 'USA');
  $('#country-table').tablesort();

  // Dropdowns
  $('#row-count').dropdown({
    action: 'activate',
    onChange: count => {
      self.table_row_count = count;
      renderTable();
    }
  });

  var timelineClick = false,
      timelineLeft = 0;
  
  // Event Listeners
  $('.ui.buttons .button').click((e) => {
    $(e.target).siblings('.active').removeClass('active');
    $(e.target).addClass('active');
    self.flow = $(e.target).data('flow') || self.flow;
    self.limit = $(e.target).data('limit') || self.limit;
    renderMap();
  });

  window.addEventListener('resize', e => map.resize());
  
  $('#timeline').mousedown(e => {
    timelineClick = true;
    timelineLeft = e.screenX - e.offsetX;
    self.year = getClosestYear(e.screenX-timelineLeft);
    renderTable();
    renderMap();
  });
  $(document).mouseup(e => {
    timelineClick = false;
  });
  $(document).mousemove(e => {
    if(timelineClick == false) return;
    self.year = getClosestYear(e.screenX-timelineLeft);
    renderTable();
    renderMap();
  });

  this.play = function play() {
    self.play_timer = setInterval(() => {
      self.incrementYear({noTable: true});
      if(self.year == self.end_year) self.pause();
    }, 90);
  }
  this.pause = function pause() {
    clearInterval(self.play_timer);
    self.play_timer = false;
    renderTable();
  }

  this.togglePlay = function togglePlay() {
    if(self.play_timer){
      self.pause();
    } else {
      self.play();
    }
  }
}

$(document).ready(() => {
  var interactive = new Interactive();

  $('.timeline-buttons .stepUp').click( e => interactive.incrementYear() );
  $('.timeline-buttons .stepDown').click( e => interactive.decrementYear() );
  $('.timeline-buttons .reset').click( e => interactive.resetYear() );

  $('.timeline-buttons .play-pause').click(e => {
    $('.play-pause i').toggleClass('icon-play');
    $('.play-pause i').toggleClass('icon-pause');
    
    interactive.togglePlay();
  });
});

