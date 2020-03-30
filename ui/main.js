window.finchNest = {
    components: ["layout"],
    loadHTML: ()=>{
        var xhr= new XMLHttpRequest();
        xhr.open('GET', "/components/"+finchNest.components.shift()+".html", true);
        xhr.onreadystatechange = function() {
            if (this.readyState!==4) return;
            if (this.status!==200) return; // or whatever error handling you want
            finchNest.env.html += this.responseText;
            if(finchNest.components.length) {
                finchNest.loadHTML();
            } else {
                finchNest.boot();
            }
        };
        xhr.send();
    },
    env: {
        closed: false,
        page: "Test"
    }
}

finchNest.load = (query)=>{return localStorage.getItem('projectFinch_'+query)}
finchNest.save = (query, data)=>{return localStorage.setItem('projectFinch_'+query,(typeof data == 'string' ? data : JSON.stringify(data)))}

finchNest.env = {
    page: finchNest.load('page') || "Dashboard",
    closed: true,
    localBots: finchNest.load('localBots')||[],
    loggedIn: false,
    minimized: "no",
    html: ""
}

finchNest.pages = {}

finchNest.boot = ()=>{
    document.querySelector("body").setAttribute("style","");
    document.querySelector("#app").setAttribute("class","showApp");
    finchNest.app = new window.Vue({
      el: '#app',
      data: {
        env: window.finchNest.env,
        accountPage: false
      },
      components: {
        'app-header': window.httpVueLoader('/components/header.vue'),
        'app-aside': window.httpVueLoader('/components/aside.vue'),
        'dashboard-content': window.httpVueLoader('/components/pages/dashboard.vue'),
        'bots-content': window.httpVueLoader('/components/pages/bots.vue'),
        'account-content': window.httpVueLoader('/components/pages/account.vue'),
        'billing-content': window.httpVueLoader('/components/pages/billing.vue')
      },
      watch: {
        "env.closed": function(toVal, fromVal) {
            if(toVal == true) { //Close the app
                document.querySelector("#app").setAttribute("class","");
                document.querySelector("body").setAttribute("style","");
                window.location.hash = "";
            } else { //Show the app
                document.querySelector("#app").setAttribute("class","showApp");
                document.querySelector("body").setAttribute("style","overflow:hidden; max-height:0px;");
                window.location.hash = "/app";
            }
        }
      },
      created: function(){
        document.querySelector('#app').innerHTML = window.finchNest.env.html;
        if(finchNest.load('user')) {
            finchNest.env.loggedIn = true;
            finchNest.env.user = JSON.parse(finchNest.load('user'));
        } 
      },
      mounted: function(){
        if(!finchNest.load('user')) {
            finchNest.save('page','My account');
            finchNest.env.page = "My account";
        }
        document.querySelector("#loginbutton").onclick = ()=>{
          window.finchNest.env.closed = false;
        }
        document.querySelector("#registerbutton").onclick = ()=>{
          window.finchNest.env.closed = false;
        }
        finchNest.env.closed = false;
      }
    })
}

window.finchNest.loadHTML();