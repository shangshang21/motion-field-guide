// The directory stays small and available before any exhibition module loads.
const halls={button:['hall','按钮','core'],cursor:['hall-cursor','光标','cursor'],text:['hall-text','文字','type'],scroll:['hall-scroll','滚动','scroll'],transition:['hall-transition','转场','transition'],shader:['hall-shader','着色器','shader'],timing:['hall-timing','节奏','timing']};
const rows=[
 ['push','01','按压下沉','Push Down','button'],['ripple','02','涟漪','Ripple','button'],['wipe','03','填充擦除','Fill Wipe','button'],['roll','04','文字翻滚','Text Roll','button'],['hold','05','长按充能','Hold to Confirm','button'],['burst','06','粒子爆裂','Particle Burst','button'],['glitch','07','故障','Glitch','button'],['jelly','08','果冻回弹','Squash & Stretch','button'],['shake','09','错误抖动','Error Shake','button'],
 ['magnetic','10','磁吸','Magnetic','cursor'],['trail','11','图片拖尾','Image Trail','cursor'],['spotlight','12','聚光灯遮罩','Spotlight Reveal','cursor'],['split','13','逐字错落','Split Text Stagger','text'],['scramble','14','乱码解码','Scramble','text'],
 ['tilt','15','三维倾斜','3D Tilt','button','extras'],['toggle','16','开关切换','Toggle','button','extras'],['submit','17','提交状态','Submit State','button','extras'],['custom','18','自定义光标','Custom Cursor','cursor','extras'],['ink','19','光标跟随墨迹','Cursor Trail','cursor','extras'],['wave','20','字重波浪','Variable Font Wave','text','extras'],['mask','21','文字遮罩填充','Text Mask Reveal','text','extras'],['typewriter','22','打字机','Typewriter','text','extras'],
 ['parallax','23','视差','Parallax','scroll'],['pinned','24','钉住滚动','Pinned Scroll','scroll'],['horizontal','25','横向滚动','Horizontal Scroll','scroll'],['reveal','26','滚动进度揭示','Scroll Reveal','scroll'],['velocity','27','滚动速度形变','Scroll Velocity Skew','scroll'],
 ['flip','28','布局动画','FLIP Layout','transition'],['shared','29','共享元素转场','Shared Element','transition'],['curtain','30','幕布转场','Curtain / Wipe','transition'],['native','31','原生视图转场','View Transitions API','transition'],
 ['distortion','32','图片扭曲','Hover Distortion','shader'],['dissolve','33','位移溶解','Displacement Transition','shader'],['gradient','34','流动渐变','Noise Gradient','shader'],['particles','35','粒子成形','Particles to Shape','shader'],
 ['easing','36','缓动曲线','Easing','timing'],['spring','37','弹簧物理','Spring','timing'],['duration','38','时长','Duration','timing'],['stagger','39','错落节奏','Stagger','timing'],
];
export const catalog=rows.map(([key,no,name,en,hall,module])=>({key,no,name,en,hall,module:module||halls[hall][2],id:halls[hall][0],hallName:halls[hall][1]}));
export const exhibitByKey=new Map(catalog.map(e=>[e.key,e]));
