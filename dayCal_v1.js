var dayCal = {
	
	init:function(serverData) {
		dayCal.serverData = serverData;
		dayCal.divIds = [];
		dayCal.totalHours = 0;
		dayCal.drawTimes();
		dayCal.addData();
	},
	
		// Helper functions
	drawTimes: function() {
		var divTimeBlock = document.getElementById('timeBlock');
		var arr = ["00:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","24:00"]
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
			console.log(document.getElementById('div'+dayCal.divIds[i].id));
			
			dayCal.divIds[i].width = document.getElementById('div'+dayCal.divIds[i].id).offsetWidth;
			dayCal.divIds[i].left = document.getElementById('div'+dayCal.divIds[i].id).offsetLeft;
			dayCal.divIds[i].height = document.getElementById('div'+dayCal.divIds[i].id).offsetHeight;	
			dayCal.divIds[i].top = (document.getElementById('div'+dayCal.divIds[i].id).offsetTop) + dayCal.divIds[i].height;
			console.log(dayCal.divIds[i].top);
			
		}
	
		 var objView = document.getElementById('dayCal-view');
		 
		 if (dayCal.serverData.length) {
			  for(var i = 0; i < dayCal.serverData.length; i++) {
				dayCal.serverData[i][2] =  (dayCal.serverData[i][2]).replace('00:00','00');
				dayCal.totalHours += dayCal.serverData[i][5];			
			  }
			  
			  for(var i = 0; i < dayCal.serverData.length; i++) {
				 dayCal.drawBooking(objView, dayCal.serverData[i]);		
			  }
		 } else {
			var divCalc = dayCal.divIds.filter(function(value, index){
				return "09:00" === value.text;
			})
			var blankEntry = document.createElement('div');
			blankEntry.className = 'entry no-hrs';
			blankEntry.style.height = (divCalc[0].height) - 5 + "px";
			blankEntry.style.top =  (divCalc[0].top) +15 + "px";
			blankEntry.style.left = divCalc[0].left + 10 + "px";		
			blankEntry.innerHTML = ' -- 0 hrs --' 	;			
			var startHr = "09:00";
			var endObj = dayCal.divIds.filter(function(value, index){
					return "17:00" === value.text;
			  })				
			blankEntry.style.width = endObj ? ((endObj[0].left -  divCalc[0].left)-2) + "px" : (8 * divCalc[0].width) + "px";
			objView.appendChild(blankEntry);
		 }
		
	},
	

	drawBooking: function(view, objData) {
		  var divCalc = dayCal.divIds.filter(function(value, index){
				return objData[2] === value.text;
		  })
		  
		  if (divCalc) {
			var hrs = objData[5]/3600;
			var newEntry = document.createElement('div');
			newEntry.className = dayCal.getCSSClass(dayCal.totalHours);
			newEntry.style.height =  (divCalc[0].height) - 5 + "px";
			newEntry.style.top =  (divCalc[0].top) +15 + "px";
			newEntry.style.left = divCalc[0].left + 5 + "px";		
			newEntry.innerHTML = objData[6]	;			
			var startHr = objData[2].split(':')[0];
			
			var endHr = parseInt(startHr) + parseInt(hrs);				
			if (hrs > 0) {
				var endObj = dayCal.divIds.filter(function(value, index){
					return (endHr.toString() + ":00") === value.text;
			  })		
			  newEntry.style.width = endObj ? ((endObj[0].left -  divCalc[0].left)-2)  + 15+ "px" : (hrs * divCalc[0].width) + "px";
			}
			view.appendChild(newEntry);
			
		  }
		  
},


  getCSSClass: function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var strClass = 'entry';
	
    if (hours > 0 && hours < 8) {
	  strClass += ' less-hrs';
	}
    else if (hours > 8) {
	  strClass += ' more-hrs';
	}
    else if (hours === 0 && minutes > 0) {
       strClass += ' less-hrs';
    }
	else if (hours === 8 && minutes === 0) {
       strClass += ' eq-hrs';
    } 
	else {
		strClass += ' no-hrs';
	}
    return strClass;
  }
  
};
