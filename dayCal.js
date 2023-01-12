var dayCal = {
	
	init:function(serverData) {
		dayCal.serverData = serverData;
		dayCal.divIds = [];
		dayCal.drawTimes();
		dayCal.addData();
	},
	
		// Helper functions
	drawTimes: function() {
		var divTimeBlock = document.getElementById('timeBlock');
		var arr = ["SoD", "06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","EoD"]
		for(var i=0;i<arr.length;i++) {
			var newTime = document.createElement('div'); 
			newTime.id = 'div'+i.toString();
			newTime.className = 'time';
			newTime.innerHTML = arr[i];
		    divTimeBlock.appendChild(newTime);		
			dayCal.divIds.push({id:i, top:0,width:0, left:0, height:0, text: arr[i]});
		}
	},
	
	
	// Helper functions
	addData: function() {
		for(var i=0;i<dayCal.divIds.length;i++) {
			dayCal.divIds[i].top = document.getElementById('div'+dayCal.divIds[i].id).offsetTop;
			dayCal.divIds[i].width = document.getElementById('div'+dayCal.divIds[i].id).offsetWidth;
			dayCal.divIds[i].left = document.getElementById('div'+dayCal.divIds[i].id).offsetLeft;
			dayCal.divIds[i].height = document.getElementById('div'+dayCal.divIds[i].id).offsetHeight;		
		}
	
		 var objView = document.getElementById('dayCal-view');
  
		  for(var i = 0; i < dayCal.serverData.length; i++) {
		    dayCal.serverData[i][2] =  (dayCal.serverData[i][2]).replace('00:00','00');
			dayCal.drawBooking(objView, dayCal.serverData[i]);
		  }
		
	},
	

	drawBooking: function(view, objData) {
		  var divCalc = dayCal.divIds.filter(function(value, index){
				return objData[2] === value.text;
		  })
		  
		  if (divCalc) {
			var hrs = objData[5]/3600;
			var newEntry = document.createElement('div');
			newEntry.className = 'entry';
			newEntry.style.height =  (divCalc[0].height) - 10 + "px";
			newEntry.style.top =  "0px";
			newEntry.style.left = divCalc[0].left + 10 + "px";			
			var startHr = objData[2].split(':')[0];
			var endHr = parseInt(startHr) + parseInt(hrs);			
			if (hrs > 0) {
				var endObj = dayCal.divIds.filter(function(value, index){
					return (endHr.toString() + ":00") === value.text;
			  })		
			  newEntry.style.width = endObj ? ((endObj[0].left -  divCalc[0].left)-2) + "px" : (hrs * divCalc[0].width) + "px";
			}
			
			newEntry.setAttribute('entry-tooltip', objData[0] + ' ( ' + objData[2] + ':' + endHr.toString() + ":00" + ' )');

			var entryTitle = document.createElement('div');
			entryTitle.className = 'entry-title';
			entryTitle.innerHTML = objData[6];			
			
			newEntry.appendChild(entryTitle);

			view.appendChild(newEntry);
			
		  }
		  
},


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
  }
  
};
