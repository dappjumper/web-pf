document.querySelector("body").setAttribute("style","");
var app = new Vue({
	el: '#app',
	data: {
        nonce: 0,
        page: "",
        minimized: false,
        bots: [],
        loading: "",
        config: {
            prefix: "project_finch_",
            autosave: true
        },
        bt: null,
        menu: [
            {
                slug: "dashboard",
                text: "Dashboard",
                icon: "tachometer",
                click: function(){
                    app.page = "dashboard";
                    app.localSave(['page']);
                }
            },{
                slug: "bots",
                text: "My bots",
                icon: "robot",
                click: function(){
                    app.page = "bots";
                    app.localSave(['page']);
                }
            },{
                slug: "settings",
                text: "Settings",
                icon: "user",
                click: function(){
                    app.page = "settings";
                    app.localSave(['page']);
                }
            },{
                slug: "billing",
                text: "Billing",
                icon: "file-invoice",
                click: function(){
                    app.page = "billing";
                    app.localSave(['page']);
                }
            }
        ],
        persistent: ["bots","page","minimized","bt","config"],
        scratch: {
            field_saving: {
                type: false,
                'meta.hideJoin':0,'meta.hideLeft':0,title:0,'apikey.telegram':0,'meta.spamFilterRegex':0,
            },
            getMeBotId: null
        },
        translate: {
            "bot.add": "Add existing bot",
            "bot.create": "Create new bot",
            "bot.view": "Bot information",
            "bots": "My bots",
            "onboard": "Project Finch",
            "type.": "No type",
            "type.janitor": "Auto-moderator",
        },
        errors: {
            botadd: "",
            botgetme: ""
        },
        feeds: {},
        wssNonce: 0,
        botNonce: 0,
        socket: io.connect('https://wss.dappjump.io/bot', { secure:true, resource: '/', path:'/',transports: ['websocket'] }),
	},
    filters: {
        date: function (value) {
            if (!value) return 'Invalid date'
            return new Date(value).toUTCString() || 'Invalid date'
        },
        date_short: function(value) {
            if(!value) return 'Invalid date';
            return new Date(value).toLocaleString() || 'Invalid date'
        }
    },
    mounted: function(){
        try {if(!window.host.indexOf('localhost') > -1) window.history.pushState("", "", '/');} catch(e){}
        this.localLoad();
        for(let bot in this.bots) {
            this.bots[bot] = {
                _id: this.bots[bot]._id,
                accesscode: this.bots[bot].accesscode
            }
        }
        if(window.location.hash == '#/app' && !this.page) {
            this.closeApp();
        }

        if(this.page) {
            document.querySelector("#ob").setAttribute('style','transition: all 0s;');
            setTimeout(()=>{
                document.querySelector("#ob").setAttribute('style','');
            },1000)
        }

        for(var bot in this.bots) {
            if(!this.feeds[this.bots[bot]._id]) this.feeds[this.bots[bot]._id] = { id: this.bots[bot]._id, data: {} };
            this.socket.emit('attachToBot', {bot: this.bots[bot]._id, code: this.bots[bot].accesscode});
            this.api(this.bots[bot]._id, this.bots[bot].accesscode, "getFeed", {}, function(response){
                if(response && !response.error) {
                    this.feed.data = response.feed;
                }
            }.bind({feed: this.feeds[this.bots[bot]._id], bot: this.bots[bot]}))
        }
        //TODO https://stackoverflow.com/questions/22431751/websocket-how-to-automatically-reconnect-after-it-dies 
        this.socket.on('attachmentAccepted',function(data){
            console.log("Successfully listening to "+data.bot+' feed');
            this.api(
                                    data.bot,
                                    data.code,
                                    "",
                                    {},
                                    function(response){
                                        if(response.error) {
                                        } else {
                                            
                                                for(var bot in this.bots) {
                                                    if(this.bots[bot]._id == response._id) {
                                                        this.bots[bot] = response;
                                                        this.botNonce++; this.wssNonce++;
                                                        this.localSave(['bots']);
                                                    }
                                                }
                                            
                                        }
                                    }.bind(this)
                                )
        }.bind(this))
        this.socket.on('botUpdated',function(data){
            try {
                for(var bot in this.bots) {
                    if(this.bots[bot]._id == data._id) {
                        this.bots[bot] = data;
                        this.botNonce++;
                        this.wssNonce++;
                        this.localSave(['bots']);
                    }
                }
            } catch(e){

            }
        }.bind(this))
        this.socket.on('feedIncoming',function(data){
            try {
                this.feeds[data.bot].data[data.chat.id] = this.feeds[data.bot].data[data.chat.id] || []
                this.feeds[data.bot].data[data.chat.id].push(data);
                this.wssNonce++;
            } catch(e){console.log(e)}
        }.bind(this))
    },
    methods: {
        onboard: function(){
            if(this.bots.length > 0) {
                this.page = 'dashboard';
                window.location.hash = "/app"
                this.localSave(['page']);
            } else {
                this.page = 'onboard';
                window.location.hash = "/app"
                this.localSave(['page']);
            }
        },
         api: function(id, code, method, payload, callback){
            var url = "https://chatapi.dappjump.io/bot/"+id+'/'+method;
            var xmlhttp = new XMLHttpRequest();

            xmlhttp.open("POST", url);
            xmlhttp.setRequestHeader("Content-Type", "application/json");
            xmlhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    try {
                        var response = JSON.parse(this.response);
                        response.api_timestamp = new Date().getTime();
                        callback(response);
                    } catch(e) {
                        console.log(e)
                        callback({error:"API Failed"})
                    }
                    }
                }
            xmlhttp.send(JSON.stringify({...{accesscode:code},...payload}));  
        },
        sendMessage: function(id, chat) {
            var bot = this.botById(id);
            var inputField = document.querySelector('input#sendMessage_'+id+'_'+chat);
            var text = inputField.value;
            inputField.value = "";
            this.api(bot._id, bot.accesscode, "sendMessage",{chat:chat,text:text}, function(response){

            }.bind(this))

        },
        botById: function(id){
            for(var bot in this.bots) {
                if(this.bots[bot]._id == id) {
                    return this.bots[bot]
                }
            }
        },
        bot_add: function(){
            this.page = 'bot.add';
        },
        bot_add_submit: function(code){
            if((code||[]).length<24) {
                this.errors.botadd = "Code too short"
            } else {
                this.errors.botadd = ""
                this.loading = "botaddsubmit";
                if(this.bots.length>0) {
                    for(var bot in this.bots) {
                        if(this.bots[bot]._id == code.substr(0,24)) {
                            this.errors.botadd = "Bot already in list";
                            this.loading = "";
                        }
                    }
                }
                if(!this.errors.botadd) this.api(
                    code.substr(0,24),
                    code.substr(24),
                    "",
                    {},
                    function(response){
                        if(response.error) {
                            this.loading = "";
                            this.errors.botadd = response.error;
                        } else {
                            if(response._id.length == 24) {
                                this.bots.push(response);
                                this.bt = this.bots.length-1;
                                this.page = "bot.view";
                                this.loading = "";
                                this.feeds[response._id] = { id: response._id, data: {} };
                                this.socket.emit('attachToBot', {bot: response._id, code: response.accesscode});
                                this.api(response._id, response.accesscode, "getFeed", {}, function(response){
                                    if(response && !response.error) {
                                        this.feed.data = response.feed;
                                    }
                                }.bind({feed: this.feeds[response._id], bot: response}))
                                this.botNonce++; this.wssNonce++;
                                this.localSave(['bots','page']);
                            } else {
                                this.loading = "";
                                this.errors.botadd = "Malformed response, contact support."
                            }
                        }
                    }.bind(this)
                )
            }
        },
        bot_view: function(id){
            if(id) {
                for(var bot in this.bots) {
                    if(this.bots[bot]._id == id) {
                        this.bt = bot;
                        this.page = "bot.view";
                        this.localSave(["page","bt"]);
                    }
                }
            }
        },
        bot_unlist: function(id){
            for(var bot in this.bots) {
                if(this.bots[bot]._id == id) {
                    if(window.confirm("Really remove? You need the access code to add it back, this is not a deletion.")) {
                        console.log(this.bt, bot)
                        if(this.bt == bot) {
                            delete this.feeds[this.bots[bot]._id];
                            this.socket.emit('detachFromBot', {bot: this.bots[bot]._id, code: this.bots[bot].accesscode});
                            this.wssNonce++; this.botNonce++;
                            this.bt = null;
                            this.page = 'bots';
                        }
                        this.bots.splice(bot,1);
                        this.localSave(['bots','page']);
                        this.localLoad();
                    }
                }
            }
        },
        bot_create: function(){
            this.page = 'bot.create';
        },
        bot_saveField: function(bot, dotNotation, value){
            if(this.config.autosave) {
                this.scratch.field_saving[dotNotation] = true;
                console.log(dotNotation)
                //api: function(id, code, method, payload, callback){
                this.api(bot._id, bot.accesscode, "saveBot",{[dotNotation]: value}, function(response){
                    this.scratch.field_saving[dotNotation] = null;
                    if(!response.error) {
                        for(var bot in this.bots) {
                            if(this.bots[bot]._id == response._id) {
                                this.bots[bot] = response;
                                this.localSave(['bots']);
                            }
                        }
                    }
                }.bind(this))
            }
        },
        bot_refresh: function(){},
        bot_getMe: function(bot){
            this.loading = "getMe_"+bot._id;
            this.scratch.getMeBotId = bot._id;
            this.api(bot._id, bot.accesscode, "setWebhook",{},()=>{})
            this.api(bot._id, bot.accesscode, "getMe",{}, function(response){
                this.loading = "";
                if(!response.error) {
                    for(var bot in this.bots) {
                        if(this.bots[bot]._id == this.scratch.getMeBotId) {
                            this.scratch.getMeBotId = null;
                            this.bots[bot].meta = this.bots[bot].meta || {};
                            this.bots[bot].meta.getMe = response;
                            this.localSave(['bots']);
                        }
                    }
                } else {
                    for(var bot in this.bots) {
                        if(this.bots[bot]._id == this.scratch.getMeBotId) {
                            this.scratch.getMeBotId = null;
                            this.bots[bot].meta = this.bots[bot].meta || {};
                            this.bots[bot].meta.getMe = null;
                            this.localSave(['bots']);
                        }
                    }
                }
            }.bind(this))
        },
        swipe_left: function(){
            if(window.innerHeight < window.innerWidth) return false;
            for(var i = 0; i<this.menu.length; i++) {
                if(this.menu[i].slug == this.page) {
                    if(i == (this.menu.length-1)) {
                        return this.menu[0].click();
                    } else {
                        return this.menu[i+1].click();
                    }
                }
            }
        },
        swipe_right: function(){
            if(window.innerHeight < window.innerWidth) return false;
            for(var i = 0; i<this.menu.length; i++) {
                if(this.menu[i].slug == this.page) {
                    if(i == 0) {
                        return this.menu[this.menu.length-1].click();
                    } else {
                        return this.menu[i-1].click()
                    }
                }
            }
        },
        localSave: function(vars){
            vars = vars || this.persistent;
            for(var i = 0; i<vars.length; i++) {
                try {
                    if(vars[i] == 'page' && window.location.hash == '' && this.bots.length > 0) window.location.hash = "/app"
                    localStorage.setItem(this.config.prefix+vars[i],JSON.stringify(this[vars[i]]))
                } catch(e){

                }
            }
        },
        localLoad: function(vars){
            vars = vars || this.persistent;
            for(var i = 0; i<vars.length; i++) {
                try {
                    this[vars[i]] = JSON.parse(localStorage.getItem(this.config.prefix+vars[i])||this[vars[i]]);
                } catch(e){

                }
            }
        },
        scrollTo: function(target){
            document.querySelector(target).scrollIntoView({ 
              behavior: 'smooth'
            });
        },
        closeApp: function(){
            this.page = ''; 
            this.localSave(['page']);
            history.pushState("", document.title, window.location.pathname); 
        },
        backButton: function(){
            this.page = (this.bots.length > 0 ? 'bots' : 'onboard')
            this.localSave(['page']);
        }
    }
});